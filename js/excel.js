/**
 * @file Contém as funções de importação e exportação para Excel.
 */
import { getAppData } from './data.js';
import { MONTHS, LOCAL_STORAGE_KEY } from './utils.js';

/**
 * Cria e baixa um arquivo Excel com a estrutura de modelo para importação.
 */
export function downloadExcelTemplate() {
    const wb = XLSX.utils.book_new();
    const currentYear = new Date().getFullYear();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ["ANO", "MÊS", "FONTE_RECEITA", "VALOR_RECEITA"],
        [currentYear, "Janeiro", "Meu Salário", 5000]
    ]), "Receitas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ["ANO", "MÊS", "CATEGORIA", "PORCENTAGEM_%"],
        [currentYear, "Janeiro", "Gasto Fixo", 60],
        [currentYear, "Janeiro", "Lazer", 30],
        [currentYear, "Janeiro", "Emergencia", 10]
    ]), "Orcamento_Categorias");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ["ANO", "MÊS", "CATEGORIA", "ITEM_DESPESA", "VALOR_GASTO"],
        [currentYear, "Janeiro", "Gasto Fixo", "Água", 100.50]
    ]), "Despesas_Realizadas");
    XLSX.writeFile(wb, "Modelo_Orcamento.xlsx");
}

/**
 * Lê um arquivo Excel selecionado pelo usuário e importa os dados para a aplicação.
 * @param {File} file - O arquivo selecionado pelo usuário.
 * @returns {Promise<boolean>} Promise que resolve para true em sucesso, e rejeita em erro.
 */
export function importFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, {
                    type: "array"
                });
                const newAppData = {};

                const ensureMonthStructure = (year, month) => {
                    if (!newAppData[year]) newAppData[year] = { months: {} };
                    if (!MONTHS.includes(month)) return false;
                    if (!newAppData[year].months[month]) {
                        newAppData[year].months[month] = {
                            incomes: [],
                            budgets: [],
                            items: {},
                            expenses: {}
                        };
                    }
                    return true;
                };

                // Processa as abas
                const wsReceitas = workbook.Sheets.Receitas;
                if (wsReceitas) {
                    XLSX.utils.sheet_to_json(wsReceitas).forEach(r => {
                        if (ensureMonthStructure(r.ANO, r.MÊS)) {
                           newAppData[r.ANO].months[r.MÊS].incomes.push({
                                name: r.FONTE_RECEITA,
                                value: r.VALOR_RECEITA || 0
                            });
                        }
                    });
                }

                const wsOrcamento = workbook.Sheets.Orcamento_Categorias;
                if (wsOrcamento) {
                    XLSX.utils.sheet_to_json(wsOrcamento).forEach(o => {
                        if (ensureMonthStructure(o.ANO, o.MÊS)) {
                            const category = o.CATEGORIA;
                            newAppData[o.ANO].months[o.MÊS].budgets.push({ name: category, percentage: o["PORCENTAGEM_%"] || 0 });
                            if (!newAppData[o.ANO].months[o.MÊS].items[category]) {
                                newAppData[o.ANO].months[o.MÊS].items[category] = [];
                            }
                        }
                    });
                }
                
                const wsDespesas = workbook.Sheets.Despesas_Realizadas;
                if(wsDespesas){
                     XLSX.utils.sheet_to_json(wsDespesas).forEach(d => {
                        if (ensureMonthStructure(d.ANO, d.MÊS)) {
                            const monthData = newAppData[d.ANO].months[d.MÊS];
                            const { CATEGORIA: category, ITEM_DESPESA: item, VALOR_GASTO: value = 0 } = d;
                            if (!monthData.items[category]) monthData.items[category] = [];
                            if (!monthData.items[category].includes(item)) monthData.items[category].push(item);
                            monthData.expenses[item] = value;
                        }
                    });
                }

                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newAppData));
                resolve(true);

            } catch (e) {
                console.error("Erro ao processar o arquivo Excel:", e);
                reject(e);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}


/**
 * Exporta os dados do ano selecionado para um arquivo Excel.
 * @param {string} year - O ano para exportar.
 */
export function exportToExcel(year) {
    const appData = getAppData();
    if (!appData[year]) {
        alert("Nenhum dado para exportar para o ano selecionado.");
        return;
    }

    let receitas = [], orcamento = [], despesas = [];

    // 1. Crie um mapa completo de "item -> categoria" para o ano inteiro primeiro.
    const itemToCategoryMap = {};
    Object.values(appData[year].months).forEach(monthDetails => {
        if (monthDetails && monthDetails.items) {
            Object.entries(monthDetails.items).forEach(([category, items]) => {
                items.forEach(item => {
                    itemToCategoryMap[item] = category;
                });
            });
        }
    });

    // 2. Agora, processe as despesas de cada mês usando o mapa completo.
    Object.entries(appData[year].months).forEach(([month, details]) => {
        if (details) {
            details.incomes.forEach(i => receitas.push([year, month, i.name, i.value]));
            details.budgets.forEach(b => orcamento.push([year, month, b.name, b.percentage]));

            Object.entries(details.expenses).forEach(([item, value]) => {
                // Inclui itens com valor maior ou IGUAL a zero.
                if (value >= 0) {
                    const category = itemToCategoryMap[item] || "Não categorizado";
                    despesas.push([year, month, category, item, value]);
                }
            });
        }
    });

    const wb = XLSX.utils.book_new();
    const wsReceitas = XLSX.utils.aoa_to_sheet([["ANO", "MÊS", "FONTE_RECEITA", "VALOR_RECEITA"], ...receitas]);
    const wsOrcamento = XLSX.utils.aoa_to_sheet([["ANO", "MÊS", "CATEGORIA", "PORCENTAGEM_%"], ...orcamento]);
    const wsDespesas = XLSX.utils.aoa_to_sheet([["ANO", "MÊS", "CATEGORIA", "ITEM_DESPESA", "VALOR_GASTO"], ...despesas]);
    
    XLSX.utils.book_append_sheet(wb, wsReceitas, "Receitas");
    XLSX.utils.book_append_sheet(wb, wsOrcamento, "Orcamento_Categorias");
    XLSX.utils.book_append_sheet(wb, wsDespesas, "Despesas_Realizadas");
    
    XLSX.writeFile(wb, `Orcamento_Pessoal_${year}.xlsx`);
}
