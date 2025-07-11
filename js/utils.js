/**
 * @file Contém constantes e funções utilitárias reutilizáveis.
 */

// Constantes da aplicação que serão usadas em vários módulos.
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const CATEGORY_COLOR_PALETTE = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997', '#6c757d'];
export const LOCAL_STORAGE_KEY = 'financeAppVFinal21';

/**
 * Formata um número como moeda BRL (Real).
 * Corrige o bug do "zero negativo" (ex: -0.001), tratando-o como zero absoluto.
 * @param {number} value - O valor a ser formatado.
 * @returns {string} O valor formatado como moeda.
 */
export function formatCurrency(value) {
    if (isNaN(value)) {
        return "R$ 0,00";
    }
    // Corrige arredondamento que pode resultar em "-0,00"
    if (value < 0 && value > -0.005) {
        value = 0;
    }
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}