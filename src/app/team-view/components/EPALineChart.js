"use client";
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import styles from "./EPALineChart.module.css"

export default function EPALineChart({ 
  label, // This is the data key name like "epa", "auto", "tele"
  data, 
  color = "#116677", 
  width = 350, 
  height = 175,
  teamNumber
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;
  
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    
    if (!cx || !cy || !payload) return null;
    
    // Check if this team won this match for the current phase
    // The data points should have a 'won' property
    const wonPhase = payload.won;
    
    // Determine color - green if won, otherwise use default color
    let fillColor = color;
    if (wonPhase === true) {
      fillColor = '#089000'; // Green for win
    } else if (wonPhase === false) {
      fillColor = '#ff5448'; // Red for loss
    }
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={4} 
        fill={fillColor} 
        stroke="#fff" 
        strokeWidth={1.5}
      />
    );
  };

  // Create a custom tooltip to show win status
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const winStatus = dataPoint.won === true ? "Won" : dataPoint.won === false ? "Lost" : "Unknown";
      
      // Capitalize the label for display
      const displayLabel = typeof label === 'string' ? 
        label.charAt(0).toUpperCase() + label.slice(1) : 
        "Value";
      
      return (
        <div className={styles.customTooltip}>
          <p>Match: {dataPoint.match}</p>
          <p>{displayLabel}: {dataPoint[label]}</p>
          <p>Status: {winStatus}</p>
          {dataPoint.fouls != null ? <p>Fouls: {dataPoint.fouls}</p> : <p>Fouls: —</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.EPALineChart}>
      <LineChart width={width} height={height} data={data}>
        <XAxis type="number" dataKey="match"/>
        <YAxis dataKey={label}/>
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey={label} 
          stroke={color} 
          strokeWidth="3" 
          dot={<CustomDot />}
        />
      </LineChart>
    </div>
  );
}