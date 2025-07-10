SELECT  
dr.forename || ' ' || dr.surname AS "Driver" 
,dr.nationality AS "Driver Nationality"
,r.name AS "Grand Prix"
,DATE_PART('year', s.date) AS "Year"
,r.number AS "Round"
,c.name AS "Circuit" 
,c.country AS "Circuit Country"
,c.latitude AS "Circuit Latitude"
,c.longitude AS "Circuit Longitude"
,c.altitude AS "Circuit Altitude"
,s.type AS "Session"
,se."position" AS "Position" 
,se.points AS "Points"
,lap.number AS "Lap"
,lap.time AS "Lap Time"
,se.detail AS "Finishing Status"
--,s.id, se.id
--DISTINCT status
--*
FROM 
formula_one_sessionentry se 
FULL OUTER JOIN formula_one_lap lap ON se.id = lap.session_entry_id
LEFT JOIN formula_one_session s ON s.id = se.session_id
LEFT JOIN formula_one_pitstop pit ON pit.lap_id = lap.id AND pit.session_entry_id = lap.session_entry_id
LEFT JOIN formula_one_roundentry re ON re.id = se.round_entry_id
LEFT JOIN formula_one_round r ON r.id = re.round_id
LEFT JOIN formula_one_circuit c ON c.id = r.circuit_id
LEFT JOIN formula_one_penalty pen_earned ON pen_earned.earned_id = se.id
LEFT JOIN formula_one_penalty pen_served ON pen_earned.served_id = se.id
LEFT JOIN formula_one_teamdriver td ON td.id = re.team_driver_id
LEFT JOIN formula_one_driver dr ON dr.id = td.driver_id
LEFT JOIN formula_one_team t ON t.id = td.team_id
--LEFT JOIN formula_one_teamchampionship tc ON tc.session_id = sese.session_id
--WHERE se.id IS NOT NULL
--AND DATE_PART('year', s.date) > 2023 
--AND s.type = 'R';
--ORDER BY s.id DESC
--LIMIT 1000;
;
 

