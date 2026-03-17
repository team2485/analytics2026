'use client';
import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function Qualitative({ radarData, teamIndices, colors, teamNumbers }) {
  const [isClient, setIsClient] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: radarData.map(item => formatLabel(item.qual)),
            datasets: teamIndices.map((teamIndex, index) => ({
              label: `Team ${teamNumbers[index] || 404}`,
              data: radarData.map(item => item[`team${teamIndex}`] || 0),
              fill: true,
              backgroundColor: colors[index] + '4D',
              borderColor: colors[index],
              pointBackgroundColor: colors[index],
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: colors[index]
            }))
          },
          options: {
            responsive: true,
            scales: {
              r: {
                angleLines: { display: true },
                suggestedMin: 0,
                suggestedMax: 5,
                ticks: { stepSize: 1 }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [isClient, radarData, teamIndices, colors, teamNumbers]);

  // Helper function to format labels
  const formatLabel = (label) => {
    const labelMap = {
      fuelspeed: 'Fuel Speed',
      maneuverability: 'Maneuverability',
      hoppercapacity: 'Hopper Capacity',
      passingquantity: 'Passing Quantity',
      climbingspeed: 'Climbing Speed',
      autodeclimbspeed: 'Auto De-Climb Speed',
      defenseevasion: 'Defense Evasion',
      climbhazard: 'Climb Hazard*'
    };
    return labelMap[label] || label;
  };

  if (!isClient) {
    return null;
  }

  return <canvas ref={chartRef} />;
}