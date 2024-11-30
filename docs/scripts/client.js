// Clic sur une section ==> affiche la section
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.add('hidden'));
    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    }
}
  
// Gestion de la case "Tout sélectionner" pour chaque table
function manageSelectAll(table) {
    
    document.getElementById(`selectAll${table}`).addEventListener('change', function() {
        
        const section = document.getElementById(`section${table}`); 
        section.querySelectorAll('input[type="checkbox"]:not(#selectAll)').forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });
}

// Activer les selectAll Pour chaque table
manageSelectAll('chauffeur');
manageSelectAll('camion');
manageSelectAll('livraison');
manageSelectAll('depot');
manageSelectAll('produit');
manageSelectAll('infraction');
manageSelectAll('absence');
manageSelectAll('marque');
manageSelectAll('modele');
manageSelectAll('appartenir');
manageSelectAll('conduire');
manageSelectAll('distance');
manageSelectAll('contenir');



// Recupère quels attributs sont cochés pour la table table
function getAttributesTicked(table) {
    const form = document.getElementById(`${table}-attributs-form`);
    if (!form) return [];
    return Array.from(form.querySelectorAll('input[type="checkbox"]:checked:not(#selectAll)'))
        .map(checkbox => checkbox.name)  
        .filter(attribute => attribute.trim() !== '');  
}


// Génère le HTML pour afficher la liste des chauffeurs
function generateTableHTML(attributes, entreeList) {
    // Filtrage des attributs pour éviter les vides
    attributes = attributes.filter(attribute => attribute && attribute.trim() !== '');
    let contentHTML = `<div class='ligne nomsattributs'>`;  
    attributes.forEach(attribute => {
        if (attribute === 'camion_id') {
            attribute = 'immatriculation';
        }
        if (attribute === 'chauffeur_id') {
            attribute = 'nom_chauffeur';
        }
        if (attribute === 'depot_depart_id') {
            attribute = 'intitule_depot_depart';
        }
        if (attribute === 'depot_arrivee_id') {
            attribute = 'intitule_depot_arrivee';
        }
        contentHTML += `<p class='ligne entete'>${attribute}</p>`;  // Titre à chaque colonne
    });
    contentHTML += `</div>`; 

    contentHTML += `<div class="table-data">`;
    entreeList.forEach(entree => {
        contentHTML += `<div class='ligne entree'>`;  
        attributes.forEach(attribute => {
            if (attribute === 'camion_id') {
                attribute = 'immatriculation';
            }
            if (attribute === 'chauffeur_id') {
                attribute = 'nom_chauffeur';
            }
            if (attribute === 'depot_depart_id') {
                attribute = 'intitule_depot_depart';
            }
            if (attribute === 'depot_arrivee_id') {
                attribute = 'intitule_depot_arrivee';
            }
            const value = entree[attribute] || ''; // Si la donnée est undefined ou null, affiche une chaîne vide
            if (attribute === "statut_livraison") {
                contentHTML += `<select class='attribut' name='statut_livraison' id='statut_livraison_${entree.livraison_id}' onchange='updateLivraison(${entree.livraison_id})'>`;
                contentHTML += `<option value='En attente' ${entree.statut_livraison === 'En attente' ? 'selected' : ''}>En attente</option>`;
                contentHTML += `<option value='En cours' ${entree.statut_livraison === 'En cours' ? 'selected' : ''}>En cours</option>`;
                contentHTML += `<option value='Terminée' ${entree.statut_livraison === 'Terminée' ? 'selected' : ''}>Terminée</option>`;
                contentHTML += `</select>`;
            }
            contentHTML += `<p class='attribut'>${value}</p>`;  

        });
        contentHTML += `</div>`;  
    });
    contentHTML += `</div>`; 

    return contentHTML;
}

 

//affiche la table table, sur les attrinbuts selectionnées dans le form html
async function displayTable(table) {
    console.log(`displayTable appelée sur ${table}`); 
    try {
        const attributes = getAttributesTicked(table);
        console.log(`   avec les attributs : ${attributes}`); 

        
        const response = await fetch(`/api/${table}Get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ attributes })
        });

    
        if (!response.ok) {
            throw new Error(`Erreur réseau : ${response.status} ${response.statusText}`);
        }

        const entreeList = await response.json();

        // Récupération du conteneur pour afficher les données
        const tableList = document.getElementById(`${table}-list`);

        // On vide la div pour préparer l'affichage
        tableList.innerHTML = '';

        tableList.innerHTML = generateTableHTML(attributes, entreeList);

    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);

        // Affichage d'un message d'erreur
        const tableList = document.getElementById(`${table}-list`);
        tableList.innerHTML = '<p>Une erreur est survenue lors du chargement des données.</p>';
    }
}

function updateLivraison(livraisonId) {
    const statut = document.getElementById(`statut_livraison_${livraisonId}`).value;
    console.log("<<<<<<ccacacacacacacacaac");
    fetch(`/api/livraisonUpdate`, {
        method: 'PUT',  
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            livraison_id: livraisonId,
            statut_livraison: statut
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Statut mis à jour:', data);
    })
    .catch(error => console.error('Erreur lors de la mise à jour:', error));
}

// Ajoute un nouveau chauffeur
async function addToTable(table, attributs) {
    const bodyData = {};
    Object.keys(attributs).forEach(attribute => {
        bodyData[attribute] = attributs[attribute];
    });
    const response = await fetch(`/api/${table}Add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
    });

    if (!response.ok) console.error('Erreur lors de l\'ajout de l\'élément');
    else console.log('Élément ajouté avec succès');
    displayTable(table); 
}

// Fonction pour charger les options du menu déroulant pour différentes tables
function loadDropdowns(table, elementId) {
    const url = `/api/${table}/ids`;

    fetch(url)
        .then(response => {
            console.log(`Statut HTTP pour ${url} : ${response.status}`);
            if (!response.ok) throw new Error(`Erreur HTTP ! statut : ${response.status}`);
            return response.json();
        })
        .then(data => {
            const eltSelect = document.getElementById(elementId); // Utilise le paramètre elementId
            if (!eltSelect) {
                console.error(`Élément avec l'ID ${elementId} non trouvé dans le DOM`);
                return;
            }
            eltSelect.innerHTML = '';  
            data.forEach(elt => {
                const option = document.createElement('option');
                option.value = elt.id;
                option.textContent = `#${elt.nom}`;
                eltSelect.appendChild(option);
            });
        })
        .catch(error => console.error(`Erreur lors du chargement des ${table}s:`, error));
}

// Pour insertion dans livraison
loadDropdowns('chauffeur', 'chauffeur_id_sel_1');  
loadDropdowns('camion', 'camion_id_sel_1');
loadDropdowns('depot','depot_depart_id_sel');
loadDropdowns('depot','depot_arrivee_id_sel');

// Dans infraction
loadDropdowns('chauffeur', 'chauffeur_id_sel_2');  

// Dans absences
loadDropdowns('chauffeur', 'chauffeur_id_sel_3'); 

//Dans modèles 
loadDropdowns('marque', 'marque_id_sel');

// Appartenir
loadDropdowns('modele', 'modele_id_sel');
loadDropdowns('camion', 'camion_id_sel_2')

// Conduire 
loadDropdowns('chauffeur', 'chauffeur_id_sel_4'); 
loadDropdowns('camion', 'camion_id_sel_3');

// Distance 
loadDropdowns('depot', 'depot_id_sel_1'); 
loadDropdowns('depot', 'depot_id_sel_2'); 

//Contenir
loadDropdowns('livraison', 'livraison_id_sel'); 
loadDropdowns('produit', 'produit_id_sel'); 


// CHAUFFEURS
async function addChauffeur() {

    const attributs = {
        nom_chauffeur: document.getElementById("nom_chauffeur").value,
        prenom_chauffeur: document.getElementById("prenom_chauffeur").value,
        adresse_avec_ville: document.getElementById("adresse_avec_ville").value,
        date_embauche: document.getElementById("date_embauche").value,
        type_permis: document.getElementById("type_permis").value,
    }; 
    console.log(Object.values(attributs)); 
    await addToTable('chauffeur', attributs); 
    console.log('Client : Chauffeur Ajouté'); 
}

// CAMIONS
async function addCamion() {
    const attributs = {
        immatriculation: document.getElementById("immatriculation").value,
        type: document.getElementById("type").value,
        date_mise_service: document.getElementById("date_mise_service").value,
        date_achat: document.getElementById("date_achat").value,
        kilometrage: document.getElementById("kilometrage").value,
        capacite: document.getElementById("capacite").value,
        etat: document.getElementById("etat").value
    };
    console.log(Object.values(attributs)); 
    // Appel à la fonction d'ajout générique (ici addToTable avec 'camion' comme table)
    await addToTable('camion', attributs);
    console.log('Client : Camion Ajouté');
}

// LIVRAISONS
async function addLivraison() {
    // Créer l'objet data avec les valeurs récupérées
    const data = {
        statut_livraison: document.getElementById('statut_livraison').value,
        chauffeur_id: document.getElementById('chauffeur_id_sel_1').value,
        camion_id: document.getElementById('camion_id_sel_1').value,
        depot_depart_id: document.getElementById('depot_depart_id_sel').value,
        date_prevue_depart: document.getElementById('date_prevue_depart').value,
        date_effective_depart: document.getElementById('date_effective_depart').value,
        depot_arrivee_id: document.getElementById('depot_arrivee_id_sel').value,
        date_prevue_arrivee: document.getElementById('date_prevue_arrivee').value,
        date_effective_arrivee: document.getElementById('date_effective_arrivee').value
    };
    console.log(Object.values(data)); 
    await addToTable('livraison', data);
    console.log('Client : Livraison Ajouté');
}

// DEPOTS 
async function addDepot() {
    const data = {
        intitule_depot: document.getElementById('intitule_depot').value,
        ville: document.getElementById('ville').value,
    };
    console.log(Object.values(data)); 
    await addToTable('depot', data);
    console.log('Client : Depots Ajouté');
}

// PRODUITS
async function addProduit() {
    const data = {
        nom_produit: document.getElementById('nom_produit').value,
        poids: document.getElementById('poids').value,
    };
    console.log(Object.values(data)); 
    await addToTable('produit', data);
    console.log('Client : produit Ajouté');
}

// INFRACTIONS 
async function addInfraction() {
    const data = {
        date_infraction: document.getElementById('date_infraction').value, 
        type_infraction: document.getElementById('type_infraction').value, 
        chauffeur_id: document.getElementById('chauffeur_id_sel_2').value
    };
    
    await addToTable('infraction', data);
    console.log('Client : produit Ajouté');
}

// ABSENCES 
async function addAbsence() {
    const data = {
        date_debut: document.getElementById('date_debut').value,
        date_fin: document.getElementById('date_fin').value, 
        chauffeur_id: document.getElementById('chauffeur_id_sel_3').value
    };
    
    await addToTable('absence', data);
    console.log('Client : absence Ajoutée');
}

// MARQUES
async function addMarque() {
    const data = {
        nom_marque: document.getElementById('nom_marque').value
    };
    
    await addToTable('marque', data);
    console.log('Client : marque ajoutée');
}

// MOELES
async function addModele() {
    const data = {
        nom_modele: document.getElementById('nom_modele').value,
        marque_id: document.getElementById('marque_id_sel').value
    };
    
    await addToTable('modele', data);
    console.log('Client : modele ajoutée');
}

// APPARTENIR
async function addAppartenir() {
    const data = {
        modele_id: document.getElementById('modele_id_sel').value,
        camion_id: document.getElementById('camion_id_sel_2').value
    };
    
    await addToTable('appartenir', data);
    console.log('Client : appartenance ajoutée');
}

// CONDUIRE
async function addConduire() {
    const data = {
        chauffeur_id: document.getElementById('chauffeur_id_sel_4').value,
        camion_id: document.getElementById('camion_id_sel_2').value
    };
    
    await addToTable('conduire', data);
    console.log('Client : conducteur ajoutée');
}

// DISTANCES
async function addDistance() {
    const data = {
        depot1_id: document.getElementById('depot_id_sel_1').value,
        depot2_id: document.getElementById('depot_id_sel_2').value, 
        distance: document.getElementById('distance').value
    };
    
    await addToTable('distance', data);
    console.log('Client : distance ajoutée');
}

// CONTENIR
async function addContenir() {
    const data = {
        livraison_id: document.getElementById('livraison_id_sel').value, 
        produit_id: document.getElementById('produit_id_sel').value,
        quantite: document.getElementById('quantite').value
    };
    
    await addToTable('contenir', data);
    console.log('Client : contenir ajouté');
}