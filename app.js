import { Transaccion } from './classes/Transaccion.js';

const form = document.getElementById('form-transaccion');
const tablaMovimientos = document.getElementById('tabla-movimientos');
const totalIngresosElem = document.getElementById('total-ingresos');
const totalGastosElem = document.getElementById('total-gastos');
const balanceNetoElem = document.getElementById('balance-neto');
const inputFecha = document.getElementById('fecha');

let idTransaccionEnEdicion = null;
let chartCategorias = null;
let chartHorizontalCategorias = null;

inputFecha.value = new Date().toISOString().split('T')[0];

actualizarInterfaz();

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const descripcion = document.getElementById('descripcion').value;
    const monto = document.getElementById('monto').value;
    const tipo = document.getElementById('tipo').value;
    const categoria = document.getElementById('categoria').value;
    const fecha = inputFecha.value;

    if (idTransaccionEnEdicion !== null) {
        Transaccion.actualizar(idTransaccionEnEdicion, { descripcion, monto, tipo, categoria, fecha });
        idTransaccionEnEdicion = null; 
        
        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.textContent = 'Registrar Transacción';
    } else {
        const nuevaTransaccion = new Transaccion(tipo, descripcion, monto, categoria, fecha);
        Transaccion.agregar(nuevaTransaccion);
    }

    actualizarInterfaz();
    form.reset();
    inputFecha.value = new Date().toISOString().split('T')[0];
});

function actualizarInterfaz() {
    tablaMovimientos.innerHTML = '';

    let ingresosTotales = 0;
    let gastosTotales = 0;

    if (Transaccion.historial.length === 0) {
        tablaMovimientos.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    No hay carga financiera registrada.
                </td>
            </tr>
        `;
    }

    Transaccion.historial.forEach((t) => {
        if (t.tipo === 'ingreso') {
            ingresosTotales += t.monto;
        } else {
            gastosTotales += t.monto;
        }

        const fila = document.createElement('tr');

        fila.innerHTML = `
            <td class="p-4 pl-1 font-mono text-xs text-gray-500">${t.id}</td>
            <td class="p-4 text-gray-400">${t.fecha || 'N/A'}</td>
            <td class="p-4">${t.descripcion}</td>
            <td class="p-4">${t.categoria}</td>
            <td class="p-4 capitalize">${t.tipo}</td>
            <td class="p-4 font-semibold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}">$${t.monto.toFixed(2)}</td>
            <td class="p-4 pr-1 text-right space-x-2">
                <button onclick="window.prepararEdicion(${t.id})" class="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-lg text-sm transition cursor-pointer">Editar</button>
                <button onclick="window.eliminarRegistro(${t.id})" class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-lg text-sm transition cursor-pointer">Eliminar</button>
            </td>
        `;

        tablaMovimientos.appendChild(fila);
    });

    const balanceNeto = ingresosTotales - gastosTotales;

    totalIngresosElem.textContent = `$${ingresosTotales.toFixed(2)}`;
    totalGastosElem.textContent = `$${gastosTotales.toFixed(2)}`;
    balanceNetoElem.textContent = `$${balanceNeto.toFixed(2)}`;

    actualizarGrafico();
    actualizarGraficoHorizontal();
}

function actualizarGrafico() {
    const canvas = document.getElementById('grafico-categorias');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const historialOrdenado = [...Transaccion.historial].sort((a, b) => {
        const diffFecha = new Date(a.fecha) - new Date(b.fecha);
        return diffFecha !== 0 ? diffFecha : a.id - b.id;
    });

    const labelsFechas = historialOrdenado.length
        ? historialOrdenado.map(t => `${t.fecha} (${t.descripcion})`)
        : ['Sin registros'];

    const ingresosData = historialOrdenado.map(t => t.tipo === 'ingreso' ? t.monto : null);
    const gastosData = historialOrdenado.map(t => t.tipo === 'gasto' ? t.monto : null);

    let acumulado = 0;
    const balanceNetoData = historialOrdenado.map(t => {
        acumulado += t.tipo === 'ingreso' ? t.monto : -t.monto;
        return acumulado;
    });

    if (chartCategorias) {
        chartCategorias.destroy();
    }

    chartCategorias = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsFechas,
            datasets: [
                {
                    label: 'Ingresos ($)',
                    data: ingresosData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.2,
                    fill: false,
                    spanGaps: true
                },
                {
                    label: 'Gastos ($)',
                    data: gastosData,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.12)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#f43f5e',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.2,
                    fill: false,
                    spanGaps: true
                },
                {
                    label: 'Balance Neto ($)',
                    data: historialOrdenado.length ? balanceNetoData : [0],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderWidth: 2.5,
                    borderDash: [5, 4],
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.25,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#e5e7eb',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(3, 7, 18, 0.95)',
                    titleColor: '#f9fafb',
                    bodyColor: '#d1d5db',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const item = historialOrdenado[index];
                            if (!item) return context[0].label;
                            return ` ${item.fecha} |  ${item.categoria} — "${item.descripcion}"`;
                        },
                        label: function(context) {
                            const valor = context.parsed.y;
                            if (valor === null || valor === undefined) return null;
                            const etiqueta = context.dataset.label.replace(' ($)', '');
                            const signo = valor < 0 ? '-' : '';
                            return ` ${etiqueta}: ${signo}$${Math.abs(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 11 },
                        maxRotation: 25,
                        minRotation: 0,
                        callback: function(value, index) {
                            const item = historialOrdenado[index];
                            return item ? item.fecha : '';
                        }
                    },
                    grid: {
                        color: 'rgba(75, 85, 99, 0.15)'
                    },
                    border: {
                        color: 'rgba(75, 85, 99, 0.4)'
                    }
                },
                y: {
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 12 },
                        callback: function(value) {
                            const signo = value < 0 ? '-' : '';
                            return `${signo}$${Math.abs(value).toLocaleString('en-US')}`;
                        }
                    },
                    grid: {
                        color: 'rgba(75, 85, 99, 0.2)',
                        borderDash: [4, 4]
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

function actualizarGraficoHorizontal() {
    const canvas = document.getElementById('grafico-horizontal-categorias');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const categoriasBase = ['Sueldo', 'Comida', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Otros'];
    const totalesPorCategoria = {};

    categoriasBase.forEach(cat => {
        totalesPorCategoria[cat] = { ingreso: 0, gasto: 0 };
    });

    Transaccion.historial.forEach(t => {
        if (!totalesPorCategoria[t.categoria]) {
            totalesPorCategoria[t.categoria] = { ingreso: 0, gasto: 0 };
        }
        totalesPorCategoria[t.categoria][t.tipo] += t.monto;
    });

    const etiquetas = Object.keys(totalesPorCategoria);
    const ingresosCat = etiquetas.map(cat => totalesPorCategoria[cat].ingreso);
    const gastosCat = etiquetas.map(cat => totalesPorCategoria[cat].gasto);

    if (chartHorizontalCategorias) {
        chartHorizontalCategorias.destroy();
    }

    chartHorizontalCategorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'Ingresos',
                    data: ingresosCat,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.75
                },
                {
                    label: 'Gastos',
                    data: gastosCat,
                    backgroundColor: 'rgba(244, 63, 94, 0.8)',
                    borderColor: '#f43f5e',
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.75
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#e5e7eb',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 14,
                        font: { size: 12, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(3, 7, 18, 0.95)',
                    titleColor: '#f9fafb',
                    bodyColor: '#d1d5db',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const valor = context.parsed.x || 0;
                            return ` ${context.dataset.label}: $${valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 11 },
                        callback: function(value) {
                            return '$' + value.toLocaleString('en-US');
                        }
                    },
                    grid: {
                        color: 'rgba(75, 85, 99, 0.2)',
                        borderDash: [4, 4]
                    },
                    border: { display: false }
                },
                y: {
                    ticks: {
                        color: '#d1d5db',
                        font: { size: 12, weight: '500' }
                    },
                    grid: { display: false },
                    border: { color: 'rgba(75, 85, 99, 0.4)' }
                }
            }
        }
    });
}

window.prepararEdicion = function(id) {
    const transaccion = Transaccion.historial.find(t => t.id === Number(id));
    if (!transaccion) return;

    document.getElementById('descripcion').value = transaccion.descripcion;
    document.getElementById('monto').value = transaccion.monto;
    document.getElementById('tipo').value = transaccion.tipo;
    document.getElementById('categoria').value = transaccion.categoria;
    inputFecha.value = transaccion.fecha || new Date().toISOString().split('T')[0];

    idTransaccionEnEdicion = transaccion.id;

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.textContent = 'Actualizar Transacción';
    form.scrollIntoView({ behavior: 'smooth' });
};

window.eliminarRegistro = function(id) {
    if (idTransaccionEnEdicion === Number(id)) {
        idTransaccionEnEdicion = null;
        form.reset();
        inputFecha.value = new Date().toISOString().split('T')[0];
        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.textContent = 'Registrar Transacción';
    }

    Transaccion.eliminar(id);
    actualizarInterfaz();
};