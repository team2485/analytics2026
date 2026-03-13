## Getting Started

First, install the dependencies:

```bash
npm install
```

Next, set up the database on Vercel with test data.
```sql

CREATE TABLE eventCompetitionYear (
   ID serial PRIMARY KEY,
   -- Match Info
   ScoutName VARCHAR(255),
   ScoutTeam INT,
   Team INT,
   Match INT,
   MatchType INT,
   NoShow BOOLEAN,
   
   -- Auto
   AutoClimb INT, -- 0=None, 1=Fail, 2=Success
   AutoClimbPosition INT, -- 0=Left, 1=Center, 2=Right (only set if AutoClimb is Success)
   AutoFuel INT,
   
   -- Tele
   IntakeGround BOOLEAN,
   IntakeOutpost BOOLEAN,
   PassingBulldozer BOOLEAN,
   PassingShooter BOOLEAN,
   PassingDump BOOLEAN,
   ShootWhileMove BOOLEAN,
   TeleFuel INT,
   DefenseLocationNZ BOOLEAN,
   DefenseLocationAZ BOOLEAN,
   
   -- End
   EndClimbPosition INT, -- 0=LeftL3, 1=LeftL2, 2=LeftL1, 3=CenterL3, 4=CenterL2, 5=CenterL1, 6=RightL3, 7=RightL2, 8=RightL1 9=None
   WideClimb BOOLEAN, -- True if robot used wide climb
   
   -- Postmatch
   ShootingMechanism INT, -- 0=Static, 1=Turret
   Bump BOOLEAN,
   Trench BOOLEAN,
   StuckOnFuel BOOLEAN,
   -- Percentage as integer (0-100)
   PlayedDefense BOOLEAN,
   Defense INT, -- 0=weak, 1=harassment, 2=game changing (only set if PlayedDefense is true)
   
   -- Qualitative Ratings (0-5 scale, -1 for not rated)
   Aggression INT DEFAULT -1,
   ClimbHazard INT DEFAULT -1,
   HopperCapacity INT DEFAULT -1,
   Maneuverability INT DEFAULT -1,
   Durability INT DEFAULT -1,
   DefenseEvasion INT DEFAULT -1,
   ClimbSpeed INT DEFAULT -1,
   FuelSpeed INT DEFAULT -1,
   PassingQuantity INT DEFAULT -1,
   AutoDeclimbSpeed INT DEFAULT -1,
   BumpSpeed INT DEFAULT -1,
   
   -- Comments
   GeneralComments TEXT,
   BreakdownComments TEXT,
   DefenseComments TEXT
);

-- Example INSERT statement
INSERT INTO eventCompetitionYear (
   ScoutName, ScoutTeam, Team, Match, MatchType, NoShow,
   AutoClimb, AutoClimbPosition, AutoFuel,
   IntakeGround, IntakeOutpost, PassingBulldozer, PassingShooter, PassingDump, ShootWhileMove, TeleFuel,
   DefenseLocationNZ, DefenseLocationAZ,
   EndClimbPosition, WideClimb,
   ShootingMechanism, Bump, Trench, StuckOnFuel, PlayedDefense, Defense,
   Aggression, ClimbHazard, HopperCapacity, Maneuverability, DefenseEvasion,
   ClimbSpeed, FuelSpeed, PassingQuantity, AutoDeclimbSpeed, BumpSpeed,
   GeneralComments, BreakdownComments, DefenseComments
)
VALUES (
   'John Doe', 2485, 4909, 12, 2, FALSE,
   1, 0, 15, TRUE,
   TRUE, FALSE, TRUE, TRUE, FALSE, TRUE, 42,
   TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE,
   2, FALSE,
   1, FALSE, TRUE, FALSE, 75, TRUE, 1,
   4, 2, 5, 4, 5, 3,
   4, 5, 3, 2, 3,
   'Performed well overall with strong fuel scoring.', 'did not break down', 'Played effective defense at outpost'
);



