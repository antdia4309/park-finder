import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import './AmenityChart.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const ROWS = [
  ['Playground', (p) => p.features.playground > 0, '#D9622B'],
  ['Dog park', (p) => p.features.dogPark > 0, '#8A5A2B'],
  ['1+ mi of paths', (p) => p.trailMiles >= 1, '#2E6E8E'],
  ['Picnic spots', (p) => p.features.picnic + p.features.bbq + p.features.shelter > 0, '#5E8C31'],
  ['Fields or courts', (p) => p.features.pitch > 0, '#71489A'],
  ['Restrooms', (p) => p.features.toilets > 0, '#6B7A6F'],
  ['Water fountains', (p) => p.features.water > 0, '#6B7A6F'],
];

function AmenityChart({ parks }) {
  if (!parks.length) return null;

  const data = {
    labels: ROWS.map(([label]) => label),
    datasets: [
      {
        data: ROWS.map(([, test]) => parks.filter(test).length),
        backgroundColor: ROWS.map(([, , color]) => color),
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (item) => `${item.raw} of ${parks.length} parks` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(30,42,34,0.08)' } },
      y: { grid: { display: false } },
    },
  };

  return (
    <section className="amenity-chart" aria-label="Amenities across these parks">
      <h2>What these parks have</h2>
      <div className="amenity-chart-canvas">
        <Bar data={data} options={options} />
      </div>
    </section>
  );
}

export default AmenityChart;
