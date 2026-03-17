"use client";
import React, { useEffect, useState } from "react";
import { Table, Button, Checkbox, Switch } from "antd";
import { calcAuto, calcTele, calcEnd, calcEPA } from "@/util/calculations";
import '@ant-design/v5-patch-for-react-19';

export default function Sudo() {
  const [data, setData] = useState([]);
  const [simplified, setSimplified] = useState(false);
  //define columns
  const sort = (a, b, f) => {
    if (f) {
      a = a[f];
      b = b[f];
    }
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };
  
  let columns = [
    {
      title: "ScoutName",
      dataIndex: "scoutname",
      key: "scoutname",
      width: 120,
      fixed: "left",
      simple: true,
      sorter: (a, b) => sort(a, b, "scoutname"),
    },
    {
      title: "Team",
      dataIndex: "team",
      key: "team",
      width: 80,
      fixed: "left",
      simple: true,
      sorter: (a, b) => sort(a, b, "team"),
    },
    {
      title: "EPA",
      key: "EPA",
      render: (text, rec) => {
        return <>{calcEPA(rec)}</>;
      },
      sorter: (a, b) => sort(calcEPA(a), calcEPA(b)),
      width: 100,
      fixed: "left",
      simple: true,
    },
    {
      title: "Match",
      dataIndex: "match",
      key: "match",
      width: 100,
      simple: true,
      sorter: (a, b) => sort(a, b, "match"),
    },
    {
      title: "Action",
      key: "action",
      render: (text, record) => (
        <Button
          danger
          onClick={async () => {
            const password = prompt("Enter your password");
            console.log({record});
            fetch("/api/delete-row", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ id: record.id, password }),
            })
              .then((resp) => {
                if (!resp.ok) {
                  return resp.json().then((error) => {
                    throw new Error(error.error);
                  });
                }
                return resp.json();
              })
              .then((respData) => {
                alert("Successfully deleted row.");
                setData(data.filter((dp) => dp.id != record.id));
              })
              .catch((error) => {
                alert(`Error: ${error.message}`);
              });
          }}
        >
          Delete
        </Button>
      ),
      width: 100,
    },

    {
      title: "AUTO",
      key: "auto",
      render: (text, record) => {
        let auto = calcAuto(record);
        return <>{auto}</>;
      },
      sorter: (a, b) => sort(calcAuto(a), calcAuto(b)),
      simple: true,
      width: 100,
    },
    {
      title: "TELE",
      key: "tele",
      render: (text, record) => {
        let tele = calcTele(record);
        return <>{tele}</>;
      },
      sorter: (a, b) => sort(calcTele(a), calcTele(b)),
      simple: true,
      width: 100,
    },
    {
      title: "END",
      key: "end",
      render: (text, record) => {
        let end = calcEnd(record);
        return <>{end}</>;
      },
      sorter: (a, b) => sort(calcEnd(a), calcEnd(b)),
      simple: true,
      width: 100,
    },
    {
      title: "Scout Team",
      dataIndex: "scoutteam",
      key: "scoutteam",
      width: 80,
      fixed: "left",
      simple: true,
      sorter: (a, b) => sort(a, b, "scoutteam"),
    },
    {
      title: "Breakdown",
      dataIndex: "breakdowncomments",
      key: "breakdowncomments",
      render: (value, record) => {
        if (value !== null) {
          return <>💥</>
        } else {
          return <>❌</>
        }
      },
      simple: true,
    },
    "noshow",
    "matchtype",
    "autoclimb",
    "autoclimbposition",
    "autofuel",
    "intakeground",
    "intakeoutpost",
    "passingbulldozer",
    "passingshooter",
    "passingdump",
    "shootwhilemove",
    "telefuel",
    "defenselocationaz",
    "defenselocationnz",
    "endclimbposition",
    "wideclimb",
    "shootingmechanism",
    "bump",
    "trench",
    "stuckonfuel",
    "stuckonbump",
    "fouls",
    "playeddefense",
    "defense",
    "climbhazard",
    "hoppercapacity",
    "maneuverability",
    "defenseevasion",
    "climbspeed",
    "fuelspeed",
    "passingquantity",
    "autodeclimbspeed",
    "generalcomments",
    "breakdowncomments",
    "defensecomments",
    "foulcomments",
  ].map((element) => {
    if (typeof element == "object") return element;
    if (element.includes("Comments")) {
      return {
        title: element,
        dataIndex: element.toLowerCase(),
        key: element.toLowerCase(),
        ellipsis: true,
      }
    }
    return {
      title: element,
      dataIndex: element.toLowerCase(),
      key: element.toLowerCase(),
      render: (text, record) => {
        //display booleans as check or x
        let visibleValue = text;
        if (typeof text == "boolean") {
          visibleValue = text ? "✅" : "❌";
        }
        
        // Format integer enum fields for readability
        const fieldName = element.toLowerCase();
        if (fieldName === "autoclimb") {
          const map = {0: "None", 1: "Fail", 2: "Success"};
          visibleValue = map[text] ?? text;
        } else if (fieldName === "autoclimbposition") {
          const map = {0: "Left", 1: "Center", 2: "Right"};
          visibleValue = map[text] ?? text;
        } else if (fieldName === "endclimbposition") {
          const map = {0: "LeftL3", 1: "LeftL2", 2: "LeftL1", 3: "CenterL3", 4: "CenterL2", 5: "CenterL1", 6: "RightL3", 7: "RightL2", 8: "RightL1"};
          visibleValue = map[text] ?? text;
        } else if (fieldName === "shootingmechanism") {
          const map = {0: "Static", 1: "Turret"};
          visibleValue = map[text] ?? text;
        } else if (fieldName === "defense") {
          const map = {0: "weak", 1: "harassment", 2: "game changing"};
          visibleValue = map[text] ?? text;
        } else if (fieldName === "fuelpercent") {
          visibleValue = text != null ? `${text}%` : text;
        }
        
        //show red if 0 (but not for boolean false)
        let style = {};
        if (text == 0 && typeof text !== "boolean") {
          style = { color: "red" };
        }
        return <div style={style}>{visibleValue}</div>;
      },
      sorter: (a, b) => sort(a, b, element.toLowerCase()),
    };
  });

  useEffect(() => {
    fetch("/api/get-data")
      .then((resp) => resp.json())
      .then((data) => {
        console.log("Fetched Data:", data);
        let sortedAndColoredData = data.rows.sort((a, b) => {
          if (a.match > b.match) return -1;
          if (a.match < b.match) return 1;
          if (a.team > b.team) return 1;
          if (a.team < b.team) return -1;
          return a.id - b.id;
        });
        //todo: add alliance colors & sorting
        console.log(sortedAndColoredData);
        setData(sortedAndColoredData)
      });
  }, []);

  columns = columns.map((col) => {
    let hidden = false;
    if (simplified && col.simple != true) hidden = true;
    return { ...col, hidden };
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "90vw",
          margin: "auto",
        }}
      >
        <br/>
        <Switch checkedChildren="Simple View" unCheckedChildren="Complex View" onChange={setSimplified}/>
        <br/>
        <Table
          columns={columns}
          dataSource={data}
          scroll={{ x: simplified ? undefined : 9000 }}
        />
      </div>
    </div>
  );
}
