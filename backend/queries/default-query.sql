SELECT 

/* Session-Level Fields */
dr.forename || ' ' || dr.surname AS "Driver" 
,dr.nationality AS "Driver Nationality"
,DATE_PART('year', dr.date_of_birth) AS "Birth Year"
,EXTRACT(YEAR FROM AGE( s.date, dr.date_of_birth)) AS "Driver Age"
,t.name AS "Team"
,t.nationality "Team Nationality"
,r.name AS "Grand Prix"
,DATE_PART('year', s.date) AS "Year"
,r.number AS "Round"
,c.name AS "Circuit" 
,c.country AS "Circuit Country"
,c.latitude AS "Circuit Latitude"
,c.longitude AS "Circuit Longitude"
,c.altitude AS "Circuit Altitude"
,s.type AS "Session"
,se."position" AS "Finishing Position" 
,se.points AS "Points"
,CASE WHEN status = 0 THEN 'Finished' 
	WHEN status = 1 THEN 'Lapped'
	WHEN status = 10 THEN 'Incident'
	WHEN status = 11 THEN 'Retirement'
	WHEN status = 20 THEN 'Disqualified'
	WHEN status = 30 THEN 'DNS'
	WHEN status = 40 THEN 'DNQ'
	WHEN status = 41 THEN 'DNPQ'
	ELSE 'NA' END AS "Final Status"
,se.detail AS "Finish Detail"
,se.laps_completed AS "Laps Completed"
,sx.total_laps AS "Laps in Race"
,dc.position AS "Driver Championship Rank"
,tc.position AS "Team Championship Rank"

/* Lap-Level Fields */
,lap.number AS "Lap"
,lap.position AS "Race Position"
,ROUND(100 * lap.number/sx.total_laps, 0) AS "Percent Race Complete"
,lap.time AS "Lap Time"
,lap.is_entry_fastest_lap
,lap.average_speed AS "Average Speed"
,lap.is_deleted AS "Lap Deleted"
,pit.number AS "Pit Stop Number"
,pit.duration AS "Pit Stop Time"


FROM 
formula_one_sessionentry se 
LEFT JOIN formula_one_session s ON s.id = se.session_id
LEFT JOIN formula_one_roundentry re ON re.id = se.round_entry_id
LEFT JOIN formula_one_round r ON r.id = re.round_id
	AND r.id = s.round_id
LEFT JOIN formula_one_season sea ON sea.id = r.season_id
LEFT JOIN formula_one_teamdriver td ON td.id = re.team_driver_id
	AND td.season_id = sea.id
LEFT JOIN formula_one_circuit c ON c.id = r.circuit_id
LEFT JOIN formula_one_driver dr ON dr.id = td.driver_id
LEFT JOIN formula_one_team t ON t.id = td.team_id
LEFT JOIN formula_one_teamchampionship tc ON tc.session_id = s.id
	AND tc.team_id = t.id AND tc.season_id = sea.id AND tc.round_id = r.id
LEFT JOIN formula_one_driverchampionship dc ON dc.session_id = s.id
	AND dc.driver_id = dr.id AND dc.season_id = sea.id AND dc.round_id = r.id
LEFT JOIN formula_one_penalty pen_earned ON pen_earned.earned_id = se.id
LEFT JOIN formula_one_penalty pen_served ON pen_earned.served_id = se.id
LEFT JOIN formula_one_session_aux sx ON sx.session_id = s.id

FULL OUTER JOIN formula_one_lap lap ON se.id = lap.session_entry_id
LEFT JOIN formula_one_pitstop pit ON pit.lap_id = lap.id AND pit.session_entry_id = lap.session_entry_id

WHERE se.id IS NOT NULL

AND DATE_PART('year', s.date) > 2022 
AND s.type IN ('R','SR','Q3','SQ3');
--ORDER BY s.id DESC
--LIMIT 100000
;