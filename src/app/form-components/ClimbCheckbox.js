"use client";
import styles from "./ClimbCheckbox.module.css";
import { useState } from "react";

export default function ClimbCheckbox({ internalName, changeListener }) {
    // Map: 0=LeftL3, 1=LeftL2, 2=LeftL1, 3=CenterL3, 4=CenterL2, 5=CenterL1, 6=RightL3, 7=RightL2, 8=RightL1, 9=None
    const [selectedValue, setSelectedValue] = useState("9"); // Default to "9" (None)

    const handleChange = (value) => {
        setSelectedValue(value);
        if (changeListener) changeListener({ type: "position", value: value });
    };

    return (
        <div className={styles.container}>
            
            <div className={styles.layout}>
                {/* Left/Center/Right Headers */}
                <div className={styles.positionHeaders}>
                    <div className={styles.spacer}></div>
                    <div className={styles.positionHeader}>Left</div>
                    <div className={styles.positionHeader}>Center</div>
                    <div className={styles.positionHeader}>Right</div>
                    <div className={styles.spacer}></div>
                </div>
                
                <div className={styles.mainArea}>
                    {/* Left L3/L2/L1 Labels */}
                    <div className={styles.levelLabels}>
                        <div className={styles.levelLabel}>L3</div>
                        <div className={styles.levelLabel}>L2</div>
                        <div className={styles.levelLabel}>L1</div>
                    </div>
                    
                    {/* The 3x3 Grid */}
                    <div className={styles.gridContainer}>
                        {/* Row 1 - L3 */}
                        <div className={styles.gridRow}>
                            <div className={`${styles.checkbox} ${styles.l3Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L3-left" 
                                    name="endClimbPosition"
                                    value="0"
                                    checked={selectedValue === "0"}
                                    onChange={() => handleChange("0")}
                                />
                            </div>
                            <div className={`${styles.checkbox} ${styles.l3Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L3-center" 
                                    name="endClimbPosition"
                                    value="3"
                                    checked={selectedValue === "3"}
                                    onChange={() => handleChange("3")}
                                />
                            </div>
                            <div className={`${styles.checkbox} ${styles.l3Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L3-right" 
                                    name="endClimbPosition"
                                    value="6"
                                    checked={selectedValue === "6"}
                                    onChange={() => handleChange("6")}
                                />
                            </div>
                        </div>
                        
                        {/* Row 2 - L2 */}
                        <div className={styles.gridRow}>
                            <div className={`${styles.checkbox} ${styles.l2Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L2-left" 
                                    name="endClimbPosition"
                                    value="1"
                                    checked={selectedValue === "1"}
                                    onChange={() => handleChange("1")}
                                />
                            </div>
                            <div className={`${styles.checkbox} ${styles.l2Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L2-center" 
                                    name="endClimbPosition"
                                    value="4"
                                    checked={selectedValue === "4"}
                                    onChange={() => handleChange("4")}
                                />
                            </div>
                            <div className={`${styles.checkbox} ${styles.l2Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L2-right" 
                                    name="endClimbPosition"
                                    value="7"
                                    checked={selectedValue === "7"}
                                    onChange={() => handleChange("7")}
                                />
                            </div>
                        </div>
                        
                        {/* Row 3 - L1 */}
                        <div className={styles.gridRow}>
                            <div className={`${styles.checkbox} ${styles.l1Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L1-left" 
                                    name="endClimbPosition"
                                    value="2"
                                    checked={selectedValue === "2"}
                                    onChange={() => handleChange("2")}
                                />
                            </div>
                            <div className={`${styles.checkbox} ${styles.l1Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L1-center" 
                                    name="endClimbPosition"
                                    value="5"
                                    checked={selectedValue === "5"}
                                    onChange={() => handleChange("5")}
                                />
                            </div>
                            <div className={`${styles.checkbox} ${styles.l1Cell}`}>
                                <input 
                                    type="radio" 
                                    id="L1-right" 
                                    name="endClimbPosition"
                                    value="8"
                                    checked={selectedValue === "8"}
                                    onChange={() => handleChange("8")}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.boxContainer}>
                <div className={styles.box}>
                    <label>
                        <input 
                            type="radio" 
                            name="endClimbPosition"
                            value="9"
                            checked={selectedValue === "9"}
                            onChange={() => handleChange("9")}
                            defaultChecked
                        />
                        None
                    </label>
                </div>
            </div>
        </div>
    );
}