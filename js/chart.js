/**
 * @file Responsável por toda a lógica de renderização de gráficos com Chart.js.
 */
import { getAppData } from './data.js';
import { formatCurrency, MONTHS, CATEGORY_COLOR_PALETTE } from './utils.js';

let expenseChartInstance = null; // Instância do gráfico para poder destruí-la e recriá-la.

/**
 * Renderiza o gráfico de despesas com base nos seletores da UI.
 */
export function renderChart() {
    if (expenseChartInstance) {
        expenseChartInstance.destroy();
        expenseChartInstance = null;
    }

    const canvas = document.getElementById("expenseChart");
    const legendContainer = document.getElementById("chart-legend");
    if (!canvas || canvas.offsetParent === null) return; // Não renderiza se o canvas não estiver visível.

    legendContainer.innerHTML = "";
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const year = document.getElementById("yearSelectorChart").value;
    const period = document.getElementById("chartPeriodSelector").value;
    const appData = getAppData();

    if (!appData[year] || (!appData[year].months[period] && period !== "Ano Inteiro")) {
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Nenhum dado para este período.", canvas.width / 2, canvas.height / 2);
        return;
    }

    const categoryToDetail = document.getElementById("chartCategorySelector").value;
    const chartType = document.querySelector('input[name="chartType"]:checked').value;
    let title = "";
    let expenseData = {};
    const monthsToProcess = period === "Ano Inteiro" ? MONTHS : [period];

    // Agrega os dados com base na seleção do usuário.
    if (categoryToDetail === "TODAS") {
        title = `Total por Categoria - ${period} de ${year}`;
        const allYearCategories = new Set();
        monthsToProcess.forEach(m => appData[year].months[m]?.budgets.forEach(b => allYearCategories.add(b.name)));
        allYearCategories.forEach(cat => expenseData[cat] = 0);
        monthsToProcess.forEach(month => {
            const details = appData[year].months[month];
            if (details) {
                allYearCategories.forEach(cat => {
                    const spentInCategory = (details.items[cat] || []).reduce((sum, item) => sum + (details.expenses[item] || 0), 0);
                    expenseData[cat] += spentInCategory;
                });
            }
        });
    } else if (categoryToDetail === "TODAS_DETALHADO") {
        title = `Todas as Despesas (Detalhado) - ${period} de ${year}`;
        monthsToProcess.forEach(month => {
            const details = appData[year].months[month];
            if (details) {
                Object.entries(details.expenses).forEach(([item, value]) => {
                    if (value > 0) expenseData[item] = (expenseData[item] || 0) + value;
                });
            }
        });
    } else {
        title = `Detalhamento de Despesas: ${categoryToDetail} - ${period} de ${year}`;
        monthsToProcess.forEach(month => {
            const details = appData[year].months[month];
            if (details) {
                (details.items[categoryToDetail] || []).forEach(item => {
                    const expenseValue = details.expenses[item] || 0;
                    if (expenseValue > 0) expenseData[item] = (expenseData[item] || 0) + expenseValue;
                });
            }
        });
    }

    const labels = Object.keys(expenseData).filter(key => expenseData[key] > 0);
    const data = labels.map(key => expenseData[key]);
    if (data.length === 0) {
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Nenhuma despesa para exibir.", canvas.width / 2, canvas.height / 2);
        return;
    }

    const backgroundColors = data.map((_, i) => CATEGORY_COLOR_PALETTE[i % CATEGORY_COLOR_PALETTE.length]);
    
    // Adiciona o "Saldo Disponível" ao gráfico, se aplicável.
    if (categoryToDetail === "TODAS" || categoryToDetail === "TODAS_DETALHADO") {
        const totalPeriodIncome = monthsToProcess.reduce((sum, month) => sum + (appData[year].months[month]?.incomes.reduce((s, i) => s + i.value, 0) || 0), 0);
        const totalSpentInChart = data.reduce((a, b) => a + b, 0);
        const remainingBalance = totalPeriodIncome - totalSpentInChart;
        if (remainingBalance > 0.01) {
            labels.push("Saldo Disponível");
            data.push(remainingBalance);
            backgroundColors.push("rgba(108, 117, 125, 0.7)");
        }
    }

    // Cria o gráfico.
    Chart.register(ChartDataLabels);
    expenseChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: "Gasto",
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace("0.7", "1")),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: title, font: { size: 18 } },
                legend: { display: false },
                datalabels: { display: false },
                tooltip: { callbacks: { label: c => `${c.label}: ${formatCurrency(c.raw)}` } }
            }
        }
    });

    // Cria a legenda HTML customizada.
    expenseChartInstance.data.labels.forEach((label, i) => {
        const value = expenseChartInstance.data.datasets[0].data[i];
        const color = expenseChartInstance.data.datasets[0].backgroundColor[i];
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color-box" style="background-color: ${color};"></span>
            <span class="legend-text">${label}: <strong>${formatCurrency(value)}</strong></span>`;
        legendContainer.appendChild(legendItem);
    });
}


/**
 * Configura o seletor de categorias para o gráfico com base nos dados do ano.
 */
export function setupChartCategorySelector() {
    const year = document.getElementById('yearSelectorChart').value;
    const categorySelector = document.getElementById('chartCategorySelector');
    const currentValue = categorySelector.value;
    const appData = getAppData();

    categorySelector.innerHTML = '<option value="TODAS">Total por Categoria</option>';
    categorySelector.innerHTML += '<option value="TODAS_DETALHADO">Todas as Despesas (Detalhado)</option>';

    if (appData[year]) {
        const allCategories = new Set();
        MONTHS.forEach(month => appData[year].months[month]?.budgets.forEach(b => allCategories.add(b.name)));
        allCategories.forEach(cat => categorySelector.add(new Option(cat, cat)));
    }
    
    // Mantém o valor selecionado se ainda existir, caso contrário, volta para o padrão.
    categorySelector.value = Array.from(categorySelector.options).some(opt => opt.value === currentValue) ? currentValue : 'TODAS';
}