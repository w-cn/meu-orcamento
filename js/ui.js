/**
 * @file Responsável por todas as manipulações do DOM (a "visão").
 * Contém funções para desenhar, atualizar e interagir com os elementos HTML.
 */
import { formatCurrency, MONTHS, CATEGORY_COLOR_PALETTE } from './utils.js';

const mainTitleElement = document.querySelector('.header-container h1');


// --- FUNÇÕES DE NAVEGAÇÃO, MODAIS E TUTORIAL ---

export function openNav() {
    document.getElementById("mySidenav").style.left = "0";
    document.getElementById("overlay").style.display = "block";
}

export function closeNav() {
    document.getElementById("mySidenav").style.left = "-280px";
    document.getElementById("overlay").style.display = "none";
}

export function openTab(tabName, year) {
    document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
    document.querySelectorAll(".sidenav a.tab-link").forEach(b => b.classList.remove("active"));

    const tabElement = document.getElementById(tabName);
    if (tabElement) tabElement.style.display = "block";

    const link = document.querySelector(`.sidenav a.tab-link[data-tab="${tabName}"]`);
    if (link) {
        link.classList.add('active');
        
        let titleHTML = link.textContent; 

        if (tabName === 'tabContas') {
            titleHTML += ` <span class="main-title-year">${year}</span>`;
        }
        
        mainTitleElement.innerHTML = titleHTML;
    }
}

export function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

export function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

export function toggleAccordion() {
    const button = document.querySelector('.accordion-button');
    const content = document.querySelector('.accordion-content');
    if (!button || !content) return;

    button.classList.toggle('open');
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

export function closeAccordion() {
    const button = document.querySelector('.accordion-button');
    const content = document.querySelector('.accordion-content');
    if (button && content) {
        button.classList.remove('open');
        content.style.maxHeight = null;
    }
}

export function startTutorial() {
    const intro = introJs();
    const sidenav = document.getElementById('mySidenav');

    intro.setOptions({
        steps: [{
            element: document.querySelector('.open-btn'),
            intro: "Bem-vindo! Clique aqui para abrir o menu de navegação a qualquer momento.",
            position: 'right'
        }, {
            element: document.querySelector('.sidenav a[data-tab="tabOrcamento"]'),
            intro: "O primeiro passo é configurar seu orçamento. Defina aqui suas fontes de renda, como planeja usar seu dinheiro e suas metas financeiras."
        }, {
            element: document.querySelector('.sidenav a[data-tab="tabContas"]'),
            intro: "Depois, use esta tela para lançar seus gastos diários em cada categoria."
        }],
        nextLabel: 'Próximo →',
        prevLabel: '← Anterior',
        doneLabel: 'Entendi!',
        showProgress: true,
        showBullets: false
    });

    intro.onbeforechange(function(targetElement) {
        if (targetElement.closest('.sidenav')) {
            openNav();
        } else {
            closeNav();
        }
    });

    const onTutorialEnd = () => {
        localStorage.setItem('tutorialComplete', 'true');
        closeNav();
        sidenav.style.transition = '';
    };

    intro.oncomplete(() => {
        onTutorialEnd();
        openTab('tabOrcamento', new Date().getFullYear());
    });
    intro.onexit(onTutorialEnd);

    sidenav.style.transition = 'none';
    intro.start();
}


// --- FUNÇÕES DE UI DA CALCULADORA DE METAS ---

export function calculateAndDisplayGoal() {
    const goalName = document.getElementById('goalName').value.trim();
    const goalAmount = parseFloat(document.getElementById('goalAmount').value);
    const goalDeadline = parseInt(document.getElementById('goalDeadline').value);
    const goalResultDiv = document.getElementById('goalResult');
    const totalIncome = Array.from(document.querySelectorAll("#incomeTable tbody input[inputmode='decimal']"))
        .reduce((sum, input) => sum + (parseFloat(input.value.replace(',', '.')) || 0), 0);

    if (goalName && goalAmount > 0 && goalDeadline > 0) {
        const monthlySavings = goalAmount / goalDeadline;
        const percentageOfIncome = totalIncome > 0 ? (monthlySavings / totalIncome) * 100 : 0;
        let resultHTML = `Para atingir sua meta "<strong>${goalName}</strong>", você precisa economizar <strong>${formatCurrency(monthlySavings)}</strong> por mês. Isso representa <strong>${percentageOfIncome.toFixed(1)}%</strong> da sua renda mensal.`;
        goalResultDiv.innerHTML = resultHTML;
        goalResultDiv.style.display = 'block';
    } else {
        goalResultDiv.style.display = 'none';
    }
}

export function clearGoalInputs() {
    document.getElementById('goalName').value = '';
    document.getElementById('goalAmount').value = '';
    document.getElementById('goalDeadline').value = '';
    document.getElementById('goalResult').style.display = 'none';
}


// --- FUNÇÕES DE UI PARA A ABA DE ORÇAMENTO ---

export function addIncomeSourceRow(name = "", value = 0) {
    const row = document.querySelector("#incomeTable tbody").insertRow();
    row.innerHTML = `
        <td><input type="text" value="${name}" data-field="name"><button class="remove-row-btn">×</button></td>
        <td><input type="text" inputmode="decimal" value="${(value > 0 ? value.toFixed(2).replace(".", ",") : "")}" placeholder="0,00" data-field="value"></td>`;
}

export function addBudgetCategoryRow(name = "", percentage = 0) {
    const row = document.getElementById("budgetBody").insertRow();
    row.innerHTML = `
        <td><input type="text" value="${name}" data-field="name"><button class="remove-row-btn">×</button></td>
        <td><input type="number" value="${(percentage > 0 ? percentage : "")}" placeholder="0" data-field="percentage"></td>
        <td></td>`;
}

export function updateBudgetUI(yearData, selectedMonth) {
    if (!yearData || !yearData.months[selectedMonth]) return;

    const details = yearData.months[selectedMonth];
    const totalIncome = details.incomes.reduce((s, i) => s + i.value, 0);

    let totalPercentage = 0;
    document.querySelectorAll("#budgetBody tr").forEach((row, index) => {
        const percentage = (details.budgets[index] && details.budgets[index].percentage) || 0;
        totalPercentage += percentage;
        row.cells[2].textContent = formatCurrency(totalIncome * (percentage / 100));
    });

    const totalPercentageEl = document.getElementById("totalPercentage");
    totalPercentageEl.textContent = `${totalPercentage.toFixed(0)}%`;
    totalPercentageEl.style.color = Math.abs(totalPercentage - 100) < 0.01 ? "green" : "red";
    document.getElementById("totalMonth").textContent = formatCurrency(totalIncome);
}

// --- FUNÇÕES DE UI PARA A ABA DE DESPESAS ---

export function buildExpensesView(appData, state) {
    const { year, month, currentView, selectedCategory } = state;
    if (!appData[year]) return;

    const allYearCategories = new Set();
    MONTHS.forEach(m => {
        appData[year].months[m]?.budgets.forEach(b => allYearCategories.add(b.name));
    });
    const categories = Array.from(allYearCategories);
    const categoryColors = {};
    categories.forEach((cat, index) => categoryColors[cat] = CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length]);

    buildCategoryFilterAccordion(categories, selectedCategory, categoryColors);

    const showAll = document.getElementById("showAllMonths").checked;
    const monthsToDisplay = (currentView === 'list' || !showAll) ? [month] : MONTHS;

    const itemToCategoryMap = {};
    MONTHS.forEach(m => {
        const monthData = appData[year].months[m];
        if (monthData?.items) {
            Object.entries(monthData.items).forEach(([cat, items]) => {
                items.forEach(item => { itemToCategoryMap[item] = cat; });
            });
        }
    });

    const allItems = new Set();
    if (selectedCategory === "TODAS") {
        monthsToDisplay.forEach(m => {
            const monthData = appData[year].months[m];
            if (monthData?.items) {
                Object.values(monthData.items).flat().forEach(item => allItems.add(item));
            }
        });
    } else {
        monthsToDisplay.forEach(m => {
            const monthData = appData[year].months[m];
            if (monthData?.items && monthData.items[selectedCategory]) {
                monthData.items[selectedCategory].forEach(item => allItems.add(item));
            }
        });
    }
    const sortedItems = Array.from(allItems).sort();

    if (currentView === 'grid') {
        buildGridView(appData, year, sortedItems, itemToCategoryMap, categoryColors, showAll, monthsToDisplay, month);
    } else {
        buildListView(appData, year, sortedItems, itemToCategoryMap, categoryColors, month);
    }

    updateAllStatusPanels(appData, year, month, selectedCategory);
    updateViewControls(currentView);
}


function buildCategoryFilterAccordion(categories, selectedCategory, categoryColors) {
    const container = document.getElementById('categoryFilterContainer');
    container.innerHTML = '';
    const accordion = document.createElement('div');
    accordion.className = 'category-filter-accordion';

    const button = document.createElement('button');
    button.className = 'accordion-button';
    if (selectedCategory !== 'TODAS') button.classList.add('active');

    button.innerHTML = `
        <div class="color-indicator" style="background-color: ${selectedCategory === 'TODAS' ? '#ccc' : categoryColors[selectedCategory] || '#ccc'};"></div>
        <span>${selectedCategory === 'TODAS' ? 'Todas as Categorias' : selectedCategory}</span>
        <span class="arrow">▼</span>`;

    const content = document.createElement('div');
    content.className = 'accordion-content';

    const allOption = document.createElement('div');
    allOption.dataset.category = 'TODAS';
    allOption.innerHTML = `<div class="color-indicator" style="background-color: #ccc;"></div> <span>Todas as Categorias</span>`;
    if (selectedCategory === 'TODAS') allOption.classList.add('active');
    content.appendChild(allOption);

    categories.forEach(cat => {
        const option = document.createElement('div');
        option.dataset.category = cat;
        option.innerHTML = `<div class="color-indicator" style="background-color: ${categoryColors[cat]};"></div> <span>${cat}</span>`;
        if (selectedCategory === cat) option.classList.add('active');
        content.appendChild(option);
    });

    accordion.appendChild(button);
    accordion.appendChild(content);
    container.appendChild(accordion);
}

function buildGridView(appData, year, items, itemToCategoryMap, categoryColors, showAll, monthsToDisplay, currentMonth) {
    const table = document.getElementById("expensesTable");
    const header = document.getElementById("expensesHeader");
    const body = document.getElementById("expensesBody");
    const monthHeader = document.getElementById("currentMonthHeader");

    header.innerHTML = "";
    body.innerHTML = "";
    table.classList.toggle("view-all-months", showAll);
    monthHeader.style.display = showAll ? 'none' : 'block';
    if (!showAll) monthHeader.textContent = `Despesas de ${currentMonth}`;


    let headerHTML = '<tr>';
    if (showAll) {
        headerHTML += '<th>Mês</th>';
    }
    headerHTML += items.map(i => {
        const itemCategory = itemToCategoryMap[i] || "";
        const color = categoryColors[itemCategory] || "#6c757d";
        return `
            <th style="border-top: 4px solid ${color};" title="Categoria: ${itemCategory}">
                <div class="th-content-wrapper">
                    <div class="header-actions">
                        <button class="item-action-btn rename-btn" data-item-name="${i}" title="Renomear '${i}'">✎</button>
                        <button class="item-action-btn remove-btn" data-item-name="${i}" title="Remover '${i}'">×</button>
                    </div>
                    <span class="item-name">${i}</span>
                </div>
            </th>`;
    }).join("");
    headerHTML += '<th><button class="add-item-btn" id="addExpenseItemBtnGrid">+</button></th></tr>';
    header.innerHTML = headerHTML;

    monthsToDisplay.forEach(month => {
        let rowHtml = `<tr data-month="${month}">`;
        if (showAll) {
            rowHtml += `<td>${month}</td>`;
        }
        const monthDetails = (appData[year] && appData[year].months[month]);
        items.forEach(item => {
            const value = (monthDetails?.expenses?.[item]) || 0;
            rowHtml += `<td><input type="text" class="expense-input" data-item-name="${item}" inputmode="decimal" value="${(value > 0 ? value.toFixed(2).replace(".", ",") : "")}" placeholder="0,00"></td>`;
        });
        rowHtml += "<td></td></tr>";
        body.innerHTML += rowHtml;
    });
}


function buildListView(appData, year, items, itemToCategoryMap, categoryColors, currentMonth) {
    const listViewContainer = document.getElementById("expenseListView");
    const monthHeader = document.getElementById("currentMonthHeader");
    listViewContainer.innerHTML = "";
    monthHeader.textContent = `Despesas de ${currentMonth}`;
    monthHeader.style.display = 'block';

    const monthDetails = appData[year]?.months[currentMonth];
    if (!monthDetails) return;

    items.forEach(item => {
        const itemCategory = itemToCategoryMap[item] || "";
        const color = categoryColors[itemCategory] || "#6c757d";
        const value = (monthDetails.expenses?.[item]) || 0;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-view-item';
        itemDiv.dataset.month = currentMonth;
        itemDiv.innerHTML = `
            <div class="category-color-bar" style="background-color: ${color};" title="Categoria: ${itemCategory}"></div>
            <div class="item-content-wrapper">
                <span class="item-name">${item}</span>
                <div class="list-item-actions">
                    <button class="item-action-btn rename-btn" data-item-name="${item}" title="Renomear">✎</button>
                    <button class="item-action-btn remove-btn" data-item-name="${item}" title="Remover">×</button>
                </div>
            </div>
            <input type="text" class="expense-input" data-item-name="${item}" inputmode="decimal" value="${(value > 0 ? value.toFixed(2).replace(".", ",") : "")}" placeholder="0,00">`;
        listViewContainer.appendChild(itemDiv);
    });
}


export function updateViewControls(viewName) {
    document.getElementById('expenseGridView').style.display = viewName === 'grid' ? 'block' : 'none';
    document.getElementById('expenseListView').style.display = viewName === 'list' ? 'block' : 'none';
    document.getElementById('showAllMonthsContainer').style.display = viewName === 'grid' ? 'block' : 'none';
    document.getElementById('add-expense-list-view-container').style.display = viewName === 'list' ? 'flex' : 'none';
    const toggleBtn = document.getElementById('view-toggle-btn');
    if (toggleBtn) {
        toggleBtn.innerHTML = viewName === 'grid' ? '☰' : '▦';
        toggleBtn.title = viewName === 'grid' ? 'Mudar para Lista' : 'Mudar para Grade';
    }
}

// --- FUNÇÕES DE UI PARA RELATÓRIOS E STATUS ---

export function updateAllStatusPanels(appData, year, month, selectedCategory) {
    const globalDetails = appData[year]?.months[month];
    if (!globalDetails) return;

    const totalIncome = globalDetails.incomes.reduce((s, i) => s + i.value, 0);
    const totalSpent = Object.values(globalDetails.expenses).reduce((s, v) => s + v, 0);
    const globalRemaining = totalIncome - totalSpent;
    const globalPanel = document.getElementById("globalStatusPanel");
    globalPanel.innerHTML = `Resumo do Mês:<strong>${formatCurrency(globalRemaining)}</strong>  de Saldo`;
    
    // ============================================================================================
    // CÓDIGO CORRIGIDO: Lógica de cores unificada para o painel global
    // ============================================================================================
    globalPanel.className = "card "; // Começa com a classe base
    if (globalRemaining < -0.005) {
        globalPanel.classList.add("status-red");
    } else if (totalIncome > 0) {
        const percentageRemaining = (globalRemaining / totalIncome);
        if (percentageRemaining < 0.15) globalPanel.classList.add("status-orange");
        else if (percentageRemaining < 0.40) globalPanel.classList.add("status-yellow");
        else if (percentageRemaining < 0.75) globalPanel.classList.add("status-green-light");
        else globalPanel.classList.add("status-green-strong");
    } else {
        // Se não há renda, o saldo é 0, então fica verde.
        globalPanel.classList.add("status-green-strong");
    }
    // ============================================================================================


    const statusPanel = document.getElementById("statusPanel");
    if (selectedCategory === "TODAS") {
        globalPanel.style.display = "block";
        statusPanel.style.display = "none";
    } else {
        globalPanel.style.display = "none";
        statusPanel.style.display = "block";
        const category = globalDetails.budgets.find(b => b.name === selectedCategory);
        if (category) {
            const spent = (globalDetails.items[selectedCategory] || []).reduce((sum, item) => sum + (globalDetails.expenses[item] || 0), 0);
            const budgeted = totalIncome * (category.percentage / 100);
            const remainingCategory = budgeted - spent;

            statusPanel.innerHTML = `Saldo para ${selectedCategory}: <strong>${formatCurrency(remainingCategory)}</strong>`;
            statusPanel.className = "card ";

            if (remainingCategory < -0.005) {
                statusPanel.classList.add("status-red");
            } else if (budgeted > 0) {
                const p = remainingCategory / budgeted;
                if (p < 0.15) statusPanel.classList.add("status-orange");
                else if (p < 0.4) statusPanel.classList.add("status-yellow");
                else if (p < 0.75) statusPanel.classList.add("status-green-light");
                else statusPanel.classList.add("status-green-strong");
            } else {
                statusPanel.classList.add("status-green-strong");
            }
        }
    }
}

export function generateAnnualReport(appData, year, view) {
    const container = document.getElementById("reportContainer");
    const summaryBox = document.getElementById("annual-summary-box");
    container.innerHTML = "";
    summaryBox.innerHTML = "";
    document.getElementById("reportYearTitle").textContent = `Relatório Anual de ${year}`;
    if (!appData[year]) {
        summaryBox.innerHTML = "<p>Nenhum dado para este ano.</p>";
        return;
    }

    let annualIncome = 0;
    let annualExpensesTotal = 0;
    const annualExpensesByCategory = {};
    const allYearCategories = new Set();
    MONTHS.forEach(m => appData[year].months[m]?.budgets.forEach(b => allYearCategories.add(b.name)));
    allYearCategories.forEach(c => annualExpensesByCategory[c] = 0);

    MONTHS.forEach(month => {
        const details = appData[year].months[month];
        if (details) {
            annualIncome += details.incomes.reduce((s, i) => s + i.value, 0);
            Object.values(details.expenses).forEach(val => annualExpensesTotal += val);
            allYearCategories.forEach(cat => {
                const spentInCategory = (details.items[cat] || []).reduce((s, item) => s + (details.expenses[item] || 0), 0);
                if (annualExpensesByCategory[cat] !== undefined) {
                    annualExpensesByCategory[cat] += spentInCategory;
                }
            });
        }
    });

    const balanceClass = (annualIncome - annualExpensesTotal >= 0) ? "report-balance-positive" : "report-balance-negative";
    let summaryHTML = `<h3>Resumo Geral ${year}</h3>
        <p><strong>Receita Total:</strong> ${formatCurrency(annualIncome)}</p>
        <p><strong>Despesa Total:</strong> ${formatCurrency(annualExpensesTotal)}</p>
        <p><strong>Saldo Anual:</strong> <span class="${balanceClass}">${formatCurrency(annualIncome - annualExpensesTotal)}</span></p>
        <hr><h4>Despesas Anuais por Categoria</h4><ul>`;
    Object.entries(annualExpensesByCategory).sort(([,a],[,b]) => b-a).forEach(([cat, val]) => summaryHTML += `<li><span>${cat}</span> <span>${formatCurrency(val)}</span></li>`);
    summaryBox.innerHTML = summaryHTML + "</ul>";

    if (view === "byCategory") {
        MONTHS.forEach(month => {
            const details = appData[year].months[month];
            if (!details || details.incomes.reduce((s, i) => s + i.value, 0) === 0) return;

            const totalIncome = details.incomes.reduce((s, i) => s + i.value, 0);
            let categoryDetailsHTML = "<ul>";
            details.budgets.forEach(cat => {
                const budgeted = totalIncome * (cat.percentage / 100);
                const spent = (details.items[cat.name] || []).reduce((s, item) => s + (details.expenses[item] || 0), 0);
                const balance = budgeted - spent;
                
                const balanceClass = balance > 0.005 ? "report-balance-positive" : (balance < -0.005 ? "report-balance-negative" : "");
                categoryDetailsHTML += `<li style="margin-top:10px;"><span><strong>${cat.name}</strong></span> <span class="${balanceClass}">Saldo: ${formatCurrency(balance)}</span></li>`;

                (details.items[cat.name] || []).sort().forEach(item => {
                    if (details.expenses[item] > 0) {
                        categoryDetailsHTML += `<li style="padding-left:15px; font-size:0.9em;"><span>${item}</span> <span>Gasto: ${formatCurrency(details.expenses[item] || 0)}</span></li>`;
                    }
                });
            });
            categoryDetailsHTML += "</ul>";
            const monthSpent = Object.values(details.expenses).reduce((s, v) => s + v, 0);
            const monthBalanceClass = (totalIncome - monthSpent >= 0) ? "report-balance-positive" : "report-balance-negative";

            container.innerHTML += `<details>
                <summary>${month}<span class="${monthBalanceClass}">${formatCurrency(totalIncome - monthSpent)}</span></summary>
                <div class="report-details-content">
                    <div><h4>Receitas</h4><ul>${details.incomes.map(i => `<li><span>${i.name}</span> <span>${formatCurrency(i.value)}</span></li>`).join("")}</ul></div>
                    <div><h4>Análise de Categorias</h4>${categoryDetailsHTML}</div>
                </div>
            </details>`;
        });
    } else {
        let allItemsAnnual = {};
        MONTHS.forEach(month => {
            if (appData[year]?.months[month]) {
                Object.entries(appData[year].months[month].expenses).forEach(([item, val]) => {
                    if (val > 0) {
                        allItemsAnnual[item] = (allItemsAnnual[item] || 0) + val;
                    }
                });
            }
        });
        let generalHTML = "<h3>Despesas Gerais do Ano</h3><ul>";
        Object.entries(allItemsAnnual).sort(([, a], [, b]) => b - a).forEach(([item, val]) => generalHTML += `<li><span>${item}</span> <span>${formatCurrency(val)}</span></li>`);
        container.innerHTML = generalHTML + "</ul>";
    }
}

// --- FUNÇÕES DE UI PARA O MODAL GENÉRICO ---

let genericModalConfirmCallback = null;

export function showConfirmationModal(title, text, onConfirm) {
    document.getElementById('genericModalTitle').textContent = title;
    document.getElementById('genericModalText').textContent = text;
    document.getElementById('genericModalInputContainer').style.display = 'none';

    genericModalConfirmCallback = onConfirm;

    openModal('genericModal');
}

export function showPromptModal(title, text, placeholder, onConfirm) {
    document.getElementById('genericModalTitle').textContent = title;
    document.getElementById('genericModalText').textContent = text;
    
    const inputContainer = document.getElementById('genericModalInputContainer');
    const input = document.getElementById('genericModalInput');
    input.value = '';
    input.placeholder = placeholder || '';
    inputContainer.style.display = 'block';

    genericModalConfirmCallback = () => {
        onConfirm(input.value);
    };

    openModal('genericModal');
    input.focus();
}

export function getGenericModalConfirmCallback() {
    return genericModalConfirmCallback;
}