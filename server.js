require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');  //Pour psql
const app = express();
const port = process.env.PORT || 10000;


console.log('Connecté à la base de données PostgreSQL');

app.use(express.json());

//affiche les requetes dans le terminal 
app.use((req, res, next) => {
  console.log(`Requête reçue : ${req.method} ${req.url}`);
  next();
});


//Pour que ca utilise les sources styles et scipts au bon endroit 
app.use(express.static('docs'));

//Recup les données du .env
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432, // Définit 5432 comme port par défaut
  ssl: {
    rejectUnauthorized: false, // Désactive la vérification SSL (nécessaire pour Render)
  },
});

// Test si psql est accessible
pool.connect((err, client, release) => {
if (err) {
    return console.error('Erreur de connexion à la base de données :', err);
  }
  console.log('Connecté à la base de données PostgreSQL');
  release(); 
});

async function getValidAttributes(table) {
  // récup les info sur la table pour obtenir les noms des colonnes
  /* const excludeID = `${table}_id`;  */
  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1`
    /* AND column_name NOT IN ('${excludeID}')`; */ // Liste d'ID à exclure
    console.log(query); 

  try {
    const result = await pool.query(query, [table]);
    console.log(result); 
    return result.rows.map(row => row.column_name);
  } catch (err) {
    console.error('Erreur lors de la récupération des colonnes de la table', err);
    throw err;
  }
} 

async function SelectSQL(res, table, filteredAttributes) {
  let attr = filteredAttributes.join(', '); // Jointure des attributs
  let query = `SELECT ${attr}, ${table}_id FROM ${table}`;

  if (table === "livraison") {
    // Remplacement des colonnes spécifiques à livraison
    if (filteredAttributes.includes("camion_id")) {
      attr = attr.replace("camion_id", "immatriculation");
    }
    if (filteredAttributes.includes("chauffeur_id")) {
      attr = attr.replace("chauffeur_id", "nom_chauffeur");
    }
    if (filteredAttributes.includes("depot_arrivee_id")) {
      attr = attr.replace("depot_arrivee_id", "depot_arrivee.intitule_depot AS intitule_depot_arrivee");
    }
    if (filteredAttributes.includes("depot_depart_id")) {
      attr = attr.replace("depot_depart_id", "depot_depart.intitule_depot AS intitule_depot_depart");
    }
  
    // Construction de la requête avec jointures et alias pour les tables depot
    query = `
      SELECT ${attr}, id_livraison
      FROM livraison 
      JOIN camion ON livraison.camion_id = camion.camion_id
      JOIN chauffeur ON livraison.chauffeur_id = chauffeur.chauffeur_id
      JOIN depot AS depot_arrivee ON livraison.depot_arrivee_id = depot_arrivee.depot_id
      JOIN depot AS depot_depart ON livraison.depot_depart_id = depot_depart.depot_id
    `;
  }

  if (table === "infraction") {
    // Remplacement des colonnes spécifiques à infraction
    if (filteredAttributes.includes("chauffeur_id")) {
      attr = attr.replace("chauffeur_id", "nom_chauffeur");
    }

    // Construction de la requête avec jointures
    query = `
      SELECT ${attr}, infraction_id 
      FROM infraction 
      JOIN chauffeur ON infraction.chauffeur_id = chauffeur.chauffeur_id
    `;
  }

  if (table === "absence") {
    // Remplacement des colonnes spécifiques à absence
    if (filteredAttributes.includes("chauffeur_id")) {
      attr = attr.replace("chauffeur_id", "nom_chauffeur");
    }

    // Construction de la requête avec jointures
    query = `
      SELECT ${attr}, absence_id
      FROM absence 
      JOIN chauffeur ON absence.chauffeur_id = chauffeur.chauffeur_id
    `;
  }

  console.log("Requête SQL générée :", query); // Vérifier la requête générée
  try {
    const result = await pool.query(query); // Exécution de la requête
    console.log(`-SERVER: ${table} affichés avec attributs sélectionnés ${attr}`);
    console.log(result.rows);

    // Construction de la réponse JSON
    const responseData = {
      table: table, // Nom de la table
      data: result.rows // Toutes les données de la requête
    };

    // Retourner la réponse
    return res.json(responseData);
    
} catch (err) {
    console.error('Erreur lors de la récupération des données :', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération des données.' });
}
}

// ajoute une entree dans une table
async function AddSQL(req, res, tableName) {
  try {
    const validAttributes = await getValidAttributes(tableName);  // Récupère les attributs valides de la table
    console.log('Attributs valides:', validAttributes);

    const attributes = Object.keys(req.body);
    console.log('Clés des données reçues:', attributes);

    const filteredAttributes = attributes.filter(attr => validAttributes.includes(attr));
    console.log('Clés filtrées (valides):', filteredAttributes);

    const filteredValues = filteredAttributes.map(attr => req.body[attr]);
    console.log('Valeurs filtrées:', filteredValues);

    if (filteredAttributes.length !== filteredValues.length) {
      console.log('Erreur: Le nombre d\'attributs et de valeurs ne correspond pas.');
      return res.status(400).json({ error: 'Le nombre d\'attributs et de valeurs ne correspond pas.' });
    }

    // Construction de la requête d'insertion
    const attributesString = filteredAttributes.join(', ');
    const placeholders = filteredAttributes.map((_, index) => `$${index + 1}`).join(', ');

    // Si la table est "APPARTENIR", on ne retourne pas un identifiant
    if (tableName === 'appartenir' || tableName === 'conduire' || tableName === 'distance'|| tableName === 'contenir') {
      const query = `INSERT INTO ${tableName} (${attributesString}) VALUES (${placeholders})`;
      console.log(query);
      await pool.query(query, filteredValues);
      console.log(`-SERVER: ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} ajouté avec succès`);
      return res.json({ message: `${tableName.charAt(0).toUpperCase() + tableName.slice(1)} ajouté avec succès` });
    }

    const query = `INSERT INTO ${tableName} (${attributesString}) VALUES (${placeholders}) RETURNING ${tableName}_id`;
    console.log(query); 
    const result = await pool.query(query, filteredValues);
    console.log(result); 

    // Utilisation de la clé dynamique pour accéder à l'ID
    console.log(`-SERVER: ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} ajouté avec succès, ID: ${result.rows[0][`${tableName}_id`]}`);
    
    return res.json({ message: `${tableName.charAt(0).toUpperCase() + tableName.slice(1)} ajouté avec succès`, id: result.rows[0][`${tableName}_id`] });
  } catch (err) {
    console.error(`Erreur lors de l'ajout de ${tableName}:`, err);
    return res.status(500).json({ error: `Erreur lors de l'ajout de ${tableName}` });
  }
}



// CHAUFFEURS
app.post('/api/chauffeurGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'chauffeur'; 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/chauffeurAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour le chauffeur:', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  await AddSQL(req, res, 'chauffeur');
});

// Route pour récupérer les IDs des chauffeurs
// Exemple de log plus détaillé dans l'API chauffeurs
app.get('/api/chauffeur/ids', async (req, res) => {
  try {
      const result = await pool.query('SELECT chauffeur_id AS id, nom_chauffeur AS nom FROM CHAUFFEUR');
      res.json(result.rows);
  } catch (error) {
      console.error('Erreur dans /api/chauffeur/ids:', error.message);
      res.status(500).json({ error: 'Erreur lors de la récupération des chauffeurs' });
  }
});

// CAMIONS 
app.post('/api/camionGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'camion'; 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    await SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});

app.post('/api/camionAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour le camion:', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  await AddSQL(req, res, 'camion');
});

// Route pour récupérer les IDs des camions
app.get('/api/camion/ids', async (req, res) => {
  try {
      const result = await pool.query('SELECT camion_id AS id, immatriculation AS nom FROM CAMION');
      res.json(result.rows);
  } catch (error) {
      console.error('Erreur dans /api/camion/ids:', error.message);
      res.status(500).json({ error: 'Erreur lors de la récupération des camionss' });
  }
});


// LIVRAISONS
app.post('/api/livraisonGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'livraison'; 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/livraisonAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour la livraison:', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  await AddSQL(req, res, 'livraison');
});

app.post('/api/livraisonUpdate', async (req, res) => {
  const { livraison_id, statut_livraison } = req.body;
  const query = `
      UPDATE livraison
      SET statut_livraison = $1
      WHERE livraison_id = $2
      RETURNING *;
  `;
  console.log('Requête SQL générée update livraison:', query);

  try {
      const result = await pool.query(query, [statut_livraison, livraison_id]);
      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Livraison non trouvée' });
      }
      res.json({ message: 'Statut mis à jour avec succès', data: result.rows[0] });
  } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

app.get('/api/livraison/ids', async (req, res) => {
  try {
      const result = await pool.query('SELECT livraison_id AS id FROM livraison');
      return res.json(result.rows);
  } catch (error) {
      console.error('Erreur dans /api/livraison/ids:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des livraisons' });
  }
});

// DEPOTS
app.post('/api/depotGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'depot'; 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    await SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});

app.post('/api/depotAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour le depot', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  await AddSQL(req, res, 'depot');
});

app.get('/api/depot/ids', async (req, res) => {
  try {
      const result = await pool.query('SELECT depot_id AS id, intitule_depot AS nom FROM DEPOT');
      return res.json(result.rows);
  } catch (error) {
      console.error('Erreur dans /api/depot_arrivee/ids:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des dépôts d\'arrivée' });
  }
});



// PRODUITS
app.post('/api/produitGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'produit'; 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});

app.post('/api/produitAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour le produit', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'produit');
});

app.get('/api/produit/ids', async (req, res) => {
  try {
      const result = await pool.query('SELECT produit_id AS id FROM PRODUIT');
      return res.json(result.rows);
  } catch (error) {
      console.error('Erreur dans /api/produit/ids:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des id de produit' });
  }
});

// INFRACTIONS 
app.post('/api/infractionGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'infraction'; 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    await SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});

app.post('/api/infractionAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour linfraction', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  await AddSQL(req, res, 'infraction');
});

// ABSENCES 
app.post('/api/absenceGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'absence'; 
  console.log('attributs:');
  console.log( attributes); 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/absenceAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour labsence', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'absence');
});

// Marques 
app.post('/api/marqueGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'marque'; 
  console.log('attributs:');
  console.log( attributes); 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/marqueAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour la marque', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'marque');
});

app.get('/api/marque/ids', async (req, res) => {
  try {
      const result = await pool.query('SELECT marque_id AS id FROM MARQUE');
      return res.json(result.rows);
  } catch (error) {
      console.error('Erreur dans /api/marque/ids:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des marques' });
  }
});



// Modele
app.post('/api/modeleGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'modele'; 
  console.log('attributs:');
  console.log( attributes); 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/modeleAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour le modele', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'modele');
});

app.get('/api/modele/ids', async (req, res) => {
  try {
      const result = await pool.query('SELECT modele_id AS id FROM modele');
      return res.json(result.rows);
  } catch (error) {
      console.error('Erreur dans /api/modele/ids:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des modeles' });
  }
});

// Appartenir
app.post('/api/appartenirGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'appartenir'; 
  console.log('attributs:');
  console.log( attributes); 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/appartenirAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour lappartenance', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'appartenir');
});


// Conduire
app.post('/api/conduireGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'conduire'; 
  console.log('attributs:');
  console.log( attributes); 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/conduireAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour lappartenance', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'conduire');
});

// distance
app.post('/api/distanceGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'distance'; 
  console.log('attributs:');
  console.log( attributes); 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/distanceAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour la distance', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'distance');
});


// contenir
app.post('/api/contenirGet', async (req, res) => {
  const { attributes } = req.body;  // recup les attributs envoyés par client
  const table = 'contenir'; 
  console.log('attributs:');
  console.log( attributes); 

  try {
    const validAttributes = await getValidAttributes(table);
    const filteredAttributes = attributes.filter(attribute => validAttributes.includes(attribute));
    
    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'Aucun attribut valide sélectionné' });
    }
    //On fait un select sur la bonne table avec les bons attributs 
    SelectSQL(res, table, filteredAttributes);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des attributs valides' });
  }
});


app.post('/api/contenirAdd', async (req, res) => {
  console.log('-  SERVER: Données reçues pour la contenir', req.body);
  //on fait un ajout sql sur la bonne table avec les bonnes données
  AddSQL(req, res, 'contenir');
});

// Suppression générique
app.delete('/api/delete', async (req, res) => {
  console.log("req:", req);
  const { id, table } = req.body;
  if (!id || !table) {
    return res.status(400).json({ error: 'ID et table sont requis' });
  }
  console.log('Table à supprimer:', table);
  console.log('ID à supprimer:', id);

  try {
      const query = `DELETE FROM ${table} WHERE ${table}_id = $1`;
      await pool.query(query, [id]); // Remplace `db.query` par votre méthode d'accès à la base de données
      return res.status(200).json({ success: true, message: `Élément supprimé de la table ${table}` });
  } catch (error) {
      console.error(`Erreur lors de la suppression dans la table ${table}:`, error);
      return res.status(500).json({ error: "Erreur serveur" });
  }
});



app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});


// Points d'api pour les requetes avaancées 
async function getTables() {
  const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
  `;
  
  try {
      const result = await pool.query(query);
      return result.rows.map(row => ({
          name: row.table_name,
          label: row.table_name.charAt(0).toUpperCase() + row.table_name.slice(1)
      }));
  } catch (error) {
      console.error("Erreur lors de la récupération des tables:", error);
      throw error;
  }
}


async function getColumns(tableName) {
  const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
  `;
  
  try {
      const result = await pool.query(query, [tableName]);
      return result.rows.map(row => ({
          name: row.column_name,
          label: row.column_name.replace(/_/g, ' ').toUpperCase()
      }));
  } catch (error) {
      console.error(`Erreur lors de la récupération des colonnes de ${tableName}:`, error);
      throw error;
  }
}




async function getValues(tableName, columnName, table1 = null, table2 = null) {

  const query = tableName === "crossJoin" && table1 && table2 
      ? `SELECT DISTINCT ${columnName} FROM ${table1} CROSS JOIN ${table2} LIMIT 100`
      : `SELECT DISTINCT ${columnName} FROM ${tableName} LIMIT 100`;

  try {
      const result = await pool.query(query);
      return result.rows.map(row => row[columnName]);
  } catch (error) {
      console.error(`Erreur lors de la récupération des valeurs pour ${columnName} dans ${tableName}:`, error);
      throw error;
  }
}




app.get('/api/tables', async (req, res) => {
  const tables = await getTables(); // Fonction à créer pour retourner les noms des tables
  res.json(tables);
});

app.get('/api/columns', async (req, res) => {
  const table = req.query.table;
  const columns = await getColumns(table); // Fonction pour retourner les colonnes d'une table
  res.json(columns);
});

app.get('/api/values', async (req, res) => {
  const { table, column, table1, table2 } = req.query;
  const values = await getValues(table, column, table1, table2);
  res.json(values);
});


app.post('/api/execute-query', async (req, res) => {
  const { query } = req.body;
  console.log(query); 
  try {
      const result = await pool.query(query); 
      console.log(result); 
      res.json(result.rows);
  } catch (error) {
      res.json({ error: error.message });
  }
});
