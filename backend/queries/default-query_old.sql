-- Default query to load F1 race results with driver and circuit information
SELECT 
    d.forename || ' ' || d.surname AS driver, 
    nationality, 
    "year", 
    round_number, 
    c.name AS circuit, 
    "position", 
    points	
FROM formula_one_driverchampionship dc 
INNER JOIN formula_one_driver d ON dc.driver_id = d.id
INNER JOIN formula_one_session s ON dc.session_id = s.id
INNER JOIN formula_one_round r ON dc.round_id = r.id
INNER JOIN formula_one_circuit c ON r.circuit_id = c.id
WHERE s.type = 'R';