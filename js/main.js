/**
 * @file Ponto de entrada e orquestrador principal da aplicação (o "controlador").
 * Responsável por conectar os eventos da UI com as funções de manipulação de dados.
 */
import {
    MONTHS
} from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Chart from './chart.js';
import * as Excel from './excel.js';

// --- ESTADO DA APLICAÇÃO ---
let state = {
    year: new Date().getFullYear().toString(),
    month: MONTHS[new Date().getMonth()],
    currentView: 'list', // 'list' ou 'grid'
    selectedCategory: 'TODAS',
};

// --- FUNÇÕES DE MANIPULAÇÃO DE EVENTOS (HANDLERS) ---

/**
 * Lida com cliques no menu de navegação lateral.
 * @param {Event} event O evento de clique.
 */
function handleNavClick(event) {
    event.preventDefault();
    const link = event.target.closest('a');
    if (!link) return;

    if (link.id === 'howToUseBtn') {
        UI.openModal('howToUseModal');
        UI.closeNav();
        return;
    }
    
    const tabName = link.dataset.tab;
    if (tabName) {
        if (tabName !== 'tabOrcamento') {
            UI.clearGoalInputs();
        }

        // CÓDIGO CORRIGIDO: Passa o ano para a função que abre a aba e atualiza o título.
        UI.openTab(tabName, state.year);
        UI.closeNav();

        const appData = Data.getAppData();
        if (tabName === 'tabRelatorio') {
            const view = document.getElementById('reportViewSelector').value;
            UI.generateAnnualReport(appData, state.year, view);
        }
        if (tabName === 'tabGraficos') {
            document.getElementById('yearSelectorChart').value = state.year;
            document.getElementById('chartPeriodSelector').value = state.month;
            Chart.setupChartCategorySelector();
            Chart.renderChart();
        }
        if (tabName === 'tabContas') {
             UI.buildExpensesView(appData, state);
        }
    }
}

/**
 * Lida com a mudança do seletor de ano na aba de orçamento.
 */
function handleYearChange() {
    state.year = document.getElementById('yearSelectorBudget').value;
    const appData = Data.getAppData();
    if (!appData[state.year]) {
        Data.initializeYearData(state.year);
    }
    displayMonthDetails();
    Chart.setupChartCategorySelector();
}

/**
 * Atualiza e redesenha a aba de orçamento com base no mês selecionado.
 */
function displayMonthDetails() {
    state.month = document.getElementById('monthSelector').value;
    const appData = Data.getAppData();
    const yearData = appData[state.year];

    document.querySelector("#incomeTable tbody").innerHTML = "";
    document.getElementById("budgetBody").innerHTML = "";

    yearData.months[state.month].incomes.forEach(src => UI.addIncomeSourceRow(src.name, src.value));
    yearData.months[state.month].budgets.forEach(cat => UI.addBudgetCategoryRow(cat.name, cat.percentage));

    UI.updateBudgetUI(yearData, state.month);
    UI.buildExpensesView(appData, state);
    UI.calculateAndDisplayGoal();
}

/**
 * Lê o estado atual das tabelas da UI e chama a função de salvamento em data.js.
 */
function saveBudgetTabChanges() {
    const selectedMonth = document.getElementById("monthSelector").value;
    const applyToAll = document.getElementById("applyToAllMonthsBudget").checked;

    const newIncomes = Array.from(document.querySelectorAll("#incomeTable tbody tr")).map(row => ({
        name: row.cells[0].querySelector("input").value.trim(),
        value: parseFloat(row.cells[1].querySelector("input").value.replace(',', '.')) || 0
    }));

    const newBudgets = Array.from(document.querySelectorAll("#budgetTable tbody tr")).map(row => ({
        name: row.cells[0].querySelector("input").value.trim(),
        percentage: parseFloat(row.cells[1].querySelector("input").value) || 0
    }));

    Data.saveBudgetState(state.year, selectedMonth, newIncomes, newBudgets, applyToAll);

    const appData = Data.getAppData();
    UI.updateBudgetUI(appData[state.year], selectedMonth);
    UI.buildExpensesView(appData, state);
    UI.calculateAndDisplayGoal();
    Chart.setupChartCategorySelector();
}


/**
 * Inicia o processo de adicionar um novo item de despesa.
 */
function handleAddExpenseItem() {
    const appData = Data.getAppData();
    let categoryName = state.selectedCategory;
    
    const allCategoriesSet = new Set();
    MONTHS.forEach(month => {
        appData[state.year]?.months[month]?.budgets.forEach(budget => {
            allCategoriesSet.add(budget.name);
        });
    });
    const availableCategories = Array.from(allCategoriesSet);


    if (categoryName === 'TODAS') {
        const chosenCategory = prompt(`Em qual categoria deseja adicionar o novo item?\nDisponíveis: ${availableCategories.join(", ")}`, availableCategories[0] || "");
        if (!chosenCategory || !availableCategories.includes(chosenCategory.trim())) {
            return alert("Categoria inválida.");
        }
        promptForNewItemName(chosenCategory.trim());
    } else {
        promptForNewItemName(categoryName);
    }
}

/**
 * Pede o nome do novo item e o adiciona.
 * @param {string} categoryName A categoria onde o item será adicionado.
 */
function promptForNewItemName(categoryName) {
    const isAllMonthsView = state.currentView === 'grid' && document.getElementById("showAllMonths").checked;
    const promptMessage = isAllMonthsView ?
        `Adicionar novo item em "${categoryName}" para o ano todo:` :
        `Adicionar novo item em "${categoryName}":`;
    
    const newItemName = prompt(promptMessage);
    if (!newItemName || !newItemName.trim()) return;
    Data.addExpenseItem(state.year, categoryName, newItemName.trim(), isAllMonthsView);
    UI.buildExpensesView(Data.getAppData(), state);
}


function handleExpenseInput(event) {
    const input = event.target;
    if (!input.classList.contains('expense-input')) return;

    const parentElement = input.closest('[data-month]');
    if (!parentElement) return;

    const month = parentElement.dataset.month;
    const item = input.dataset.itemName;
    const oldValue = parseFloat(input.dataset.oldValue) || 0;
    const userInput = input.value.trim().replace(',', '.');

    if (userInput === '') {
        input.value = oldValue > 0 ? oldValue.toFixed(2).replace('.', ',') : '';
        return;
    }

    let finalValue;
    if (userInput.startsWith('- ')) {
        const amount = parseFloat(userInput.substring(2));
        finalValue = !isNaN(amount) ? oldValue - amount : oldValue;
    } else {
        const amount = parseFloat(userInput);
        finalValue = !isNaN(amount) ? oldValue + amount : oldValue;
    }

    input.value = finalValue > 0 ? finalValue.toFixed(2).replace('.', ',') : '';
    Data.updateExpenseValue(state.year, month, item, finalValue);
    UI.updateAllStatusPanels(Data.getAppData(), state.year, state.month, state.selectedCategory);
}


function handleCategoryFilterClick(event) {
    if (event.target.closest('.accordion-button')) {
        UI.toggleAccordion();
        return;
    }

    const categoryDiv = event.target.closest('[data-category]');
    if (categoryDiv) {
        state.selectedCategory = categoryDiv.dataset.category;
        localStorage.setItem('financeAppPreferredCategory', state.selectedCategory);
        UI.closeAccordion();
        UI.buildExpensesView(Data.getAppData(), state);
    }
}


// --- INICIALIZAÇÃO ---

/**
 * Adiciona todos os event listeners da aplicação.
 */
function bindEvents() {
    // Navegação e Modais
    document.getElementById('openNavBtn').addEventListener('click', UI.openNav);
    document.getElementById('closeNavBtn').addEventListener('click', UI.closeNav);
    document.getElementById('overlay').addEventListener('click', UI.closeNav);
    document.getElementById('mySidenav').addEventListener('click', handleNavClick);
    document.querySelectorAll('.close-btn[data-modal-id]').forEach(btn => {
        btn.addEventListener('click', () => UI.closeModal(btn.dataset.modalId));
    });
    document.getElementById('genericModalCancelBtn').addEventListener('click', () => UI.closeModal('genericModal'));
    document.getElementById('genericModalConfirmBtn').addEventListener('click', () => {
        const callback = UI.getGenericModalConfirmCallback();
        if (callback) callback();
        UI.closeModal('genericModal');
    });

    // Orçamento e Metas
    document.getElementById('yearSelectorBudget').addEventListener('change', handleYearChange);
    document.getElementById('monthSelector').addEventListener('change', displayMonthDetails);
    document.getElementById('goalSection').addEventListener('input', UI.calculateAndDisplayGoal);
    
    const budgetTab = document.getElementById('tabOrcamento');
    budgetTab.addEventListener('focusout', (event) => {
         if (event.target.tagName === 'INPUT' && event.target.closest('table')) {
            saveBudgetTabChanges();
        }
    });
    budgetTab.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-row-btn')) {
            event.target.closest('tr').remove();
            saveBudgetTabChanges();
        } else if (event.target.id === 'addIncomeSourceBtn' || event.target.id === 'addBudgetCategoryBtn') {
            if (event.target.id === 'addIncomeSourceBtn') {
                UI.addIncomeSourceRow();
            } else {
                UI.addBudgetCategoryRow();
            }
            saveBudgetTabChanges();
        }
    });


    // Despesas
    document.getElementById('view-toggle-btn').addEventListener('click', () => {
        state.currentView = state.currentView === 'grid' ? 'list' : 'grid';
        localStorage.setItem('financeAppView', state.currentView);
        UI.buildExpensesView(Data.getAppData(), state);
    });
    document.getElementById('showAllMonths').addEventListener('change', () => UI.buildExpensesView(Data.getAppData(), state));
    document.getElementById('tabContas').addEventListener('focusin', (e) => {
        if (e.target.classList.contains('expense-input')) {
            e.target.dataset.oldValue = parseFloat(e.target.value.replace(',', '.')) || 0;
            e.target.value = '';
        }
    });
    document.getElementById('tabContas').addEventListener('focusout', handleExpenseInput);
    document.getElementById('categoryFilterContainer').addEventListener('click', handleCategoryFilterClick);
    document.getElementById('addExpenseItemBtnList').addEventListener('click', handleAddExpenseItem);
    document.getElementById('expenseGridView').addEventListener('click', (e) => {
        if (e.target.id === 'addExpenseItemBtnGrid') {
            handleAddExpenseItem();
        }
    });

    // Gráficos e Relatórios
    document.getElementById('chartControlsContainer').addEventListener('change', Chart.renderChart);
    document.getElementById('reportViewSelector').addEventListener('change', (e) => {
        UI.generateAnnualReport(Data.getAppData(), state.year, e.target.value);
    });
    document.getElementById('yearSelectorReport').addEventListener('change', (e) => {
        state.year = e.target.value;
        const view = document.getElementById('reportViewSelector').value;
        UI.generateAnnualReport(Data.getAppData(), state.year, view);
    });

    // Configurações e Excel
    document.getElementById('importBtn').addEventListener('click', () => UI.openModal('importModal'));
    document.getElementById('downloadTemplateBtn').addEventListener('click', Excel.downloadExcelTemplate);
    document.getElementById('exportBtn').addEventListener('click', () => Excel.exportToExcel(state.year));
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm("ATENÇÃO!\n\nVocê tem certeza que deseja resetar todos os dados?\n\nEsta ação é irreversível.")) {
            if (Data.resetAllData()) {
                alert("Todos os dados foram resetados com sucesso.");
                location.reload();
            }
        }
    });
    document.getElementById('importFromExcelBtn').addEventListener('click', async () => {
        const fileInput = document.getElementById("importFile");
        if (!fileInput.files.length) return alert("Por favor, selecione um arquivo.");

        try {
            await Excel.importFromExcel(fileInput.files[0]);
            alert("Dados importados com sucesso!");
            location.reload();
        } catch (e) {
            alert("Erro ao importar o arquivo. Verifique se o formato e os nomes das abas estão corretos.");
        }
    });

    window.addEventListener('click', (event) => {
        const accordion = document.querySelector('.category-filter-accordion');
        if (accordion && !accordion.contains(event.target)) {
            UI.closeAccordion();
        }
    });
}

/**
 * Ponto de partida da aplicação.
 * Configura o estado inicial e os seletores.
 */
function initialize() {
    Data.loadData();

    if (!localStorage.getItem('tutorialComplete')) {
        setTimeout(UI.startTutorial, 500);
    }

    state.currentView = localStorage.getItem('financeAppView') || 'list';
    state.selectedCategory = localStorage.getItem('financeAppPreferredCategory') || 'TODAS';
    state.month = MONTHS[new Date().getMonth()];

    const appData = Data.getAppData();
    const yearsWithData = Object.keys(appData).length > 0 ? Object.keys(appData).sort((a, b) => b - a) : [String(new Date().getFullYear())];
    ['yearSelectorBudget', 'yearSelectorReport', 'yearSelectorChart'].forEach(id => {
        const selector = document.getElementById(id);
        selector.innerHTML = '';
        yearsWithData.forEach(year => selector.add(new Option(year, year)));
        selector.value = yearsWithData.includes(state.year) ? state.year : yearsWithData[0];
        state.year = selector.value;
    });

    const monthSelectorBudget = document.getElementById('monthSelector');
    monthSelectorBudget.innerHTML = '';
    MONTHS.forEach(month => monthSelectorBudget.add(new Option(month, month)));
    monthSelectorBudget.value = state.month;
    
    const chartPeriodSelector = document.getElementById('chartPeriodSelector');
    chartPeriodSelector.innerHTML = '';
    chartPeriodSelector.add(new Option('Ano Inteiro', 'Ano Inteiro'));
    MONTHS.forEach(month => chartPeriodSelector.add(new Option(month, month)));
    chartPeriodSelector.value = state.month;
    
    bindEvents();
    displayMonthDetails();
    // Inicia na aba correta com o título correto
    UI.openTab('tabContas', state.year);
}

// --- PONTO DE ENTRADA DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', initialize);