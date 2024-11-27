//Charge les tables dans le menu deroulant
async function loadTables() {
    try {
        const response = await fetch('/api/tables');
        const tables = await response.json();
        const tableSelect = document.getElementById('table-select');

        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.name;
            option.textContent = table.label;
            tableSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des tables:", error);
    }
}

// Charge les colonnes de la table sélectionnée dans le menu deroulant correspondant
async function loadColumns() {
    const table = document.getElementById('tableSelect').value;
    if (!table) return;

    const response = await fetch(`/api/columns?table=${table}`);
    const columns = await response.json();

    const columnSelect = document.getElementById('columnSelect');
    columnSelect.innerHTML = '<option value="">Sélectionnez une colonne</option>';
    columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column.name;
        option.textContent = column.label;
        columnSelect.appendChild(option);
    });

    document.getElementById('valueSelect').innerHTML = '<option value="">Sélectionnez une valeur</option>';
}

// Charger les valeurs possibles pour la colonne sélectionnée
async function loadValues() {
    const table = document.getElementById('tableSelect').value;
    const column = document.getElementById('columnSelect').value;
    if (!column) return;

    let url = `/api/values?`;
    
    // Ajoutez les tables pour le cross join
    if (table === "crossJoin") {
        const table1 = document.getElementById('table1Select').value;
        const table2 = document.getElementById('table2Select').value;
        url += `table1=${table1}&table1=${table2}`;
    }
    else {
        url += `table=${table}&column=${column}`;
    }

    try {
        const response = await fetch(url);
        const values = await response.json();

        const valueSelect = document.getElementById('valueSelect');
        valueSelect.innerHTML = '<option value="">Sélectionnez une valeur</option>';
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            valueSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des valeurs :", error);
    }
}


// Mise à jour de handleTableChange pour inclure le produit cartésien
async function handleTableChange() {
    const table = document.getElementById('table-select').value;
    const columnSelect = document.getElementById('column-select');
    const valueSelect = document.getElementById('value-select');
    const operatorSelect = document.getElementById('operator-select');
    const columnCheckboxContainer = document.getElementById('column-checkbox-container');
    const crossJoinContainer = document.getElementById('cross-join-container');

    // Réinitialiser les menus déroulants
    columnSelect.innerHTML = '<option value="">Sélectionnez une colonne</option>';
    valueSelect.innerHTML = '<option value="">Sélectionnez une valeur</option>';
    operatorSelect.innerHTML = '<option value="">Sélectionnez un opérateur</option>'; 
    operatorSelect.disabled = true; 
    
    // Désactive les menus cases à cocher si aucune table sélectionnée
    columnSelect.disabled = !table;
    valueSelect.disabled = !table;
    columnCheckboxContainer.innerHTML = '';

    if (!table) return; 

    try {
        // Cas spécifique pour le produit cartésien
        if (table === "crossJoin") {
            crossJoinContainer.style.display = "block";
            loadTablesIntoCrossJoinSelects();
            return;
        } else {
            crossJoinContainer.style.display = "none";
        }

        // Récupérer les colonnes de la table sélectionnée
        const response = await fetch(`/api/columns?table=${table}`);
        const columns = await response.json();

        // Créer les cases à cocher pour chaque colonne dans "column-checkbox-container"
        columns.forEach(column => {
            const checkboxLabel = document.createElement('label');
            checkboxLabel.textContent = column.label;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = column.name;
            checkbox.className = 'column-checkbox';
            checkbox.addEventListener('change', updateQueryPreview); // Lier un événement pour mettre à jour la prévisualisation de la requête

            checkboxLabel.prepend(checkbox);
            columnCheckboxContainer.appendChild(checkboxLabel);
        });

        // Remplir le menu déroulant WHERE
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.name;
            option.textContent = column.label;
            columnSelect.appendChild(option);
        });

        // Activer le menu déroulant pour choisir un opérateur
        operatorSelect.disabled = false;

    } catch (error) {
        console.error("Erreur lors du chargement des colonnes:", error);
    }
}

async function handleColumnChange() {
    const table = document.getElementById('table-select').value;
    const column = document.getElementById('column-select').value;
    const valueSelect = document.getElementById('value-select');
    const operatorSelect = document.getElementById('operator-select');
    const valueInputContainer = document.getElementById('value-input-container');

    valueSelect.innerHTML = '<option value="">Sélectionnez une valeur ou un attribut</option>';
    operatorSelect.innerHTML = '';
    valueInputContainer.style.display = 'none';

    if (!column) return;

    try {
        const table1 = document.getElementById('table1-select').value;
        const table2 = document.getElementById('table2-select').value;
        
        const url = table === "crossJoin"
            ? `/api/values?table1=${table1}&table2=${table2}`
            : `/api/values?table=${table}&column=${column}`;

        const valueResponse = await fetch(url);
        const values = await valueResponse.json();
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = `Valeur : ${value}`;
            option.dataset.type = 'value';
            valueSelect.appendChild(option);
        });

        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Saisir une valeur';
        valueSelect.appendChild(customOption);

    } catch (error) {
        console.error("Erreur lors du chargement des valeurs ou des opérateurs :", error);
    }
}






function handleValueSelectChange() {
    const valueSelect = document.getElementById('value-select');
    const valueInputContainer = document.getElementById('value-input-container');

    if (valueSelect.value === 'custom') {
        valueInputContainer.style.display = 'block';
    } else {
        valueInputContainer.style.display = 'none';
    }
}

// Fonction pour colorer la requête SQL
/* function styleQuery(query) {
    // Liste des mots-clés et opérateurs SQL
    const sqlKeywords = ["SELECT", "FROM", "WHERE", "JOIN", "ON", "ORDER BY", "GROUP BY", "HAVING", "AND", "OR", "IN", "BETWEEN", "LIKE"];
    const operators = ["=", "<", ">", "<=", ">=", "!=", "LIKE", "BETWEEN"];

    // Styliser les mots-clés SQL
    sqlKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        query = query.replace(regex, `<span style="color: blue; font-weight: bold;">${keyword}</span>`);
    });

    // Styliser les opérateurs
    operators.forEach(operator => {
        const regex = new RegExp(`\\b${operator}\\b`, "g");
        query = query.replace(regex, `<span style="color: red;">${operator}</span>`);
    });

    // Styliser les noms de tables et colonnes
    query = query.replace(/\b(\w+)\b/g, match => {
        if (!sqlKeywords.includes(match.toUpperCase()) && !operators.includes(match)) {
            return `<span style="color: green;">${match}</span>`;
        }
        return match;
    });
    console.log(query)
    return query;
}
 */


function updateQueryPreview() {
    const tableSelect = document.getElementById('table-select').value;
    const table1 = document.getElementById('table1-select').value;
    const table2 = document.getElementById('table2-select').value;
    const checkboxes = document.querySelectorAll('.column-checkbox:checked');
    const columnSelect = document.getElementById('column-select').value;
    const operatorSelect = document.getElementById('operator-select').value;
    const valueSelect = document.getElementById('value-select').value;
    const inputValue = document.getElementById('input-value') ? document.getElementById('input-value').value : '';

    const selectedColumns = Array.from(checkboxes).map(cb => cb.value);
    const columnsPart = selectedColumns.length > 0 ? selectedColumns.join(', ') : '*';

    let query;

    // Gestion du produit cartésien
    if (tableSelect === "crossJoin" && table1 && table2) {
        query = `SELECT ${columnsPart} FROM ${table1} CROSS JOIN ${table2}`;
    } else {
        // Requête standard
        query = `SELECT ${columnsPart} FROM ${tableSelect || '...'}`;
    }

    // Gestion des conditions WHERE
    if (columnSelect && operatorSelect) {
        let valueToUse = valueSelect === 'custom' && inputValue ? inputValue : valueSelect;
        if (valueToUse) {
            query += ` WHERE ${columnSelect} ${operatorSelect} '${valueToUse}'`;
        }
    } else if (columnSelect) {
        query += ` WHERE ${columnSelect} ${operatorSelect || '='} ...`;
    }

    document.getElementById('query-preview').innerHTML = query;
}


// Fonction pour charger les colonnes des deux tables dans le cas du produit cartésien
async function loadColumnsForCrossJoin() {
    const table1 = document.getElementById('table1-select').value;
    const table2 = document.getElementById('table2-select').value;
    const columnCheckboxContainer = document.getElementById('column-checkbox-container');
    const columnSelect = document.getElementById('column-select'); // Ajout de cette ligne
    columnCheckboxContainer.innerHTML = ''; // Vider le conteneur des cases à cocher
    columnSelect.innerHTML = '<option value="">Sélectionnez une colonne</option>'; // Vider le menu déroulant WHERE

    if (!table1 || !table2) return;

    try {
        // Charger les colonnes de la première table
        const response1 = await fetch(`/api/columns?table=${table1}`);
        const columns1 = await response1.json();

        // Charger les colonnes de la deuxième table
        const response2 = await fetch(`/api/columns?table=${table2}`);
        const columns2 = await response2.json();

        // Créer les cases à cocher pour les colonnes de la première table et ajouter les options au menu WHERE
        columns1.forEach(column => {
            const checkboxLabel = document.createElement('label');
            checkboxLabel.textContent = `${table1}.${column.label}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = `${table1}.${column.name}`;
            checkbox.className = 'column-checkbox';
            checkbox.addEventListener('change', updateQueryPreview);

            checkboxLabel.prepend(checkbox);
            columnCheckboxContainer.appendChild(checkboxLabel);

            // Ajouter l'option au menu déroulant WHERE
            const option = document.createElement('option');
            option.value = `${table1}.${column.name}`;
            option.textContent = `${table1}.${column.label}`;
            columnSelect.appendChild(option);
        });

        // Créer les cases à cocher pour les colonnes de la deuxième table et ajouter les options au menu WHERE
        columns2.forEach(column => {
            const checkboxLabel = document.createElement('label');
            checkboxLabel.textContent = `${table2}.${column.label}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = `${table2}.${column.name}`;
            checkbox.className = 'column-checkbox';
            checkbox.addEventListener('change', updateQueryPreview);

            checkboxLabel.prepend(checkbox);
            columnCheckboxContainer.appendChild(checkboxLabel);

            // Ajouter l'option au menu déroulant WHERE
            const option = document.createElement('option');
            option.value = `${table2}.${column.name}`;
            option.textContent = `${table2}.${column.label}`;
            columnSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Erreur lors du chargement des colonnes pour le produit cartésien :", error);
    }
}





function updateCrossJoinPreview() {
    const table1 = document.getElementById('table1-select').value;
    const table2 = document.getElementById('table2-select').value;
    const checkboxes = document.querySelectorAll('.column-checkbox:checked');

    const selectedColumns = Array.from(checkboxes).map(cb => cb.value);
    const columnsPart = selectedColumns.length > 0 ? selectedColumns.join(', ') : '*';

    if (table1 && table2) {
        let query = `SELECT ${columnsPart} FROM ${table1} CROSS JOIN ${table2}`;
        document.getElementById('query-preview').innerHTML = query;

        // Charger les colonnes pour le conteneur de cases à cocher si les deux tables sont sélectionnées
        loadColumnsForCrossJoin();
    }
}

// Fonction pour charger les tables dans les menus déroulants de produit cartésien
async function loadTablesIntoCrossJoinSelects() {
    try {
        const response = await fetch('/api/tables');
        const tables = await response.json();
        
        const table1Select = document.getElementById('table1-select');
        const table2Select = document.getElementById('table2-select');

        // Réinitialise les menus déroulants de tables pour le produit cartésien
        table1Select.innerHTML = '<option value="">Sélectionnez une table</option>';
        table2Select.innerHTML = '<option value="">Sélectionnez une table</option>';

        // Ajouter les tables dans chaque menu
        tables.forEach(table => {
            const option1 = document.createElement('option');
            option1.value = table.name;
            option1.textContent = table.label;
            table1Select.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = table.name;
            option2.textContent = table.label;
            table2Select.appendChild(option2);
        });

    } catch (error) {
        console.error("Erreur lors du chargement des tables pour le produit cartésien:", error);
    }
}




// Affiche les résultats en utilisant generateTableHTML pr le tableau
function displayResults(results) {
    // Vérifie si des résultats
    if (!results || results.length === 0) {
        console.error("Aucun résultat à afficher");
        document.getElementById('resultat-list').innerHTML = '<p>Aucun résultat trouvé.</p>';
        return;
    }

    // Récupération des attributs (colonnes) depuis le premier élément de results
    const attributes = Object.keys(results[0]);

    // Génère le contenu HTML en utilisant generateTableHTML
    const tableHTML = generateTableHTML(attributes, results);

    
    document.getElementById('resultat-list').innerHTML = tableHTML;
}


async function executeQuery() {
    
    const query = document.getElementById('query-preview').textContent;
    
    try {
        const response = await fetch('/api/execute-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        // Vérification de la réponse
        if (!response.ok) {
            throw new Error(`Erreur réseau : ${response.status} ${response.statusText}`);
        }

        
        const results = await response.json();

        
        displayResults(results);

    } catch (error) {
        console.error("Erreur lors de l'exécution de la requête :", error);
        document.getElementById('resultat-list').innerHTML = '<p>Erreur lors de l\'exécution de la requête.</p>';
    }
}


// Appel initial pour remplir le menu des tables
document.addEventListener('DOMContentLoaded', loadTables);


//On updtae la previsualisation de la requete des que qq chose bouge
document.getElementById('table-select').addEventListener('change', updateQueryPreview);
document.getElementById('column-select').addEventListener('change', updateQueryPreview);
document.getElementById('value-select').addEventListener('change', updateQueryPreview); 