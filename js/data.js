/**
 * @file Gerencia o estado da aplicação (o "cérebro").
 * Responsável por carregar, salvar e modificar todos os dados no localStorage.
 * É a única fonte da verdade para os dados da aplicação.
 */
import {
    LOCAL_STORAGE_KEY,
    MONTHS
} from './utils.js';

// --- ESTADO CENTRAL ---
let appData = {};

// --- GERENCIAMENTO PRINCIPAL DE DADOS (CARREGAR, SALVAR, RESETAR) ---

export function loadData() {
    try {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        appData = storedData ? JSON.parse(storedData) : {};
    } catch (e) {
        console.error("Não foi possível acessar o localStorage.", e);
        appData = {};
    }
    if (Object.keys(appData).length === 0) {
        initializeYearData(new Date().getFullYear());
    }
}

export function saveData() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error("Não foi possível salvar no localStorage.", e);
    }
}

export function resetAllData() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('financeAppPreferredCategory');
    localStorage.removeItem('financeAppView');
    appData = {};
    return true;
}

export function getAppData() {
    return JSON.parse(JSON.stringify(appData));
}


// --- INICIALIZAÇÃO DE DADOS ---

export function initializeYearData(year) {
    if (appData[year]) return;

    appData[year] = { months: {} };
    const defaultIncomes = [{ name: 'Meu Salário', value: 0 }];
    const defaultBudgets = [{ name: 'Gasto Fixo', percentage: 60 }, { name: 'Lazer', percentage: 30 }, { name: 'Emergencia', percentage: 10 }];
    const defaultItems = { 'Gasto Fixo': ['Água', 'Luz', 'Telefone'], 'Lazer': ['Cinema', 'Bar'], 'Emergencia': ['Emergencia'] };
    const defaultExpenses = {};
    Object.values(defaultItems).flat().forEach(item => { defaultExpenses[item] = 0; });

    MONTHS.forEach(month => {
        appData[year].months[month] = {
            incomes: JSON.parse(JSON.stringify(defaultIncomes)),
            budgets: JSON.parse(JSON.stringify(defaultBudgets)),
            items: JSON.parse(JSON.stringify(defaultItems)),
            expenses: JSON.parse(JSON.stringify(defaultExpenses))
        };
    });
    saveData();
}

// ============================================================================================
// CÓDIGO CORRIGIDO: Lógica de atualização do orçamento reescrita para sincronização total.
// ============================================================================================
// --- MANIPULAÇÃO DE DADOS DO ORÇAMENTO (Receitas e Categorias) ---

/**
 * Salva o estado atual das tabelas de orçamento.
 * Se 'applyToAll' for verdadeiro, replica o estado do mês de origem para todos os outros meses.
 * @param {string} year - O ano atual.
 * @param {string} sourceMonth - O mês que está sendo editado.
 * @param {Array} newIncomes - O array completo de receitas lido da UI.
 * @param {Array} newBudgets - O array completo de categorias lido da UI.
 * @param {boolean} applyToAll - Se a replicação está ativa.
 */
export function saveBudgetState(year, sourceMonth, newIncomes, newBudgets, applyToAll) {
    if (!appData[year] || !appData[year].months[sourceMonth]) return;

    // Primeiro, salva o estado atual no mês de origem.
    appData[year].months[sourceMonth].incomes = JSON.parse(JSON.stringify(newIncomes));
    appData[year].months[sourceMonth].budgets = JSON.parse(JSON.stringify(newBudgets));

    // Se a replicação estiver ativa, usa os dados recém-salvos como "mestre" e copia para todos.
    if (applyToAll) {
        const masterIncomes = appData[year].months[sourceMonth].incomes;
        const masterBudgets = appData[year].months[sourceMonth].budgets;
        
        MONTHS.forEach(m => {
            if (m !== sourceMonth && appData[year].months[m]) {
                appData[year].months[m].incomes = JSON.parse(JSON.stringify(masterIncomes));
                appData[year].months[m].budgets = JSON.parse(JSON.stringify(masterBudgets));
            }
        });
    }
    saveData();
}
// ============================================================================================

// --- MANIPULAÇÃO DE DADOS DE DESPESAS (Itens) ---

export function updateExpenseValue(year, month, item, value) {
    if (appData[year] && appData[year].months[month]) {
        appData[year].months[month].expenses[item] = value;
        saveData();
    }
}

export function addExpenseItem(year, categoryName, newItemName, forAllYear) {
    const monthTarget = MONTHS[new Date().getMonth()];
    const monthsToUpdate = forAllYear ? MONTHS : [monthTarget];
    
    monthsToUpdate.forEach(month => {
        const monthData = appData[year]?.months[month];
        if (monthData?.budgets.some(b => b.name === categoryName)) {
            monthData.items[categoryName] = monthData.items[categoryName] || [];
            if (!monthData.items[categoryName].includes(newItemName)) {
                monthData.items[categoryName].push(newItemName);
                monthData.expenses[newItemName] = 0;
            }
        }
    });
    saveData();
}

export function removeExpenseItem(year, itemName) {
    MONTHS.forEach(month => {
        const monthData = appData[year]?.months[month];
        if (monthData) {
            Object.keys(monthData.items).forEach(categoryName => {
                monthData.items[categoryName] = monthData.items[categoryName].filter(i => i !== itemName);
            });
            delete monthData.expenses[itemName];
        }
    });
    saveData();
}

export function renameExpenseItem(year, oldItemName, newItemName) {
    MONTHS.forEach(month => {
        const monthData = appData[year]?.months[month];
        if (monthData) {
            Object.keys(monthData.items).forEach(category => {
                const itemIndex = monthData.items[category].indexOf(oldItemName);
                if (itemIndex > -1) {
                    monthData.items[category][itemIndex] = newItemName;
                }
            });
            if (monthData.expenses.hasOwnProperty(oldItemName)) {
                monthData.expenses[newItemName] = monthData.expenses[oldItemName];
                delete monthData.expenses[oldItemName];
            }
        }
    });
    saveData();
}