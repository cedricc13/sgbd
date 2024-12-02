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

function generateTableHTML(attributes, entreeList) {
    const table = entreeList.table;  
    attributes = attributes.filter(attribute => attribute && attribute.trim() !== '');
    let contentHTML = `<div class='ligne nomsattributs'>`;  
    attributes.forEach(attribute => {
        if (attribute === 'camion_id') attribute = 'immatriculation';
        if (attribute === 'chauffeur_id') attribute = 'nom_chauffeur';
        if (attribute === 'depot_depart_id') attribute = 'intitule_depot_depart';
        if (attribute === 'depot_arrivee_id') attribute = 'intitule_depot_arrivee';
        contentHTML += `<p class='ligne entete'>${attribute}</p>`;
    });
    contentHTML += `</div>`; 
    console.log(JSON.stringify(entreeList, null, 2));
    const dataEntreeList = entreeList.data;;
    contentHTML += `<div class="table-data">`;
    dataEntreeList.forEach(entree => {
        contentHTML += `<div class='ligne entree'>`;  
        attributes.forEach(attribute => {
            if (attribute === 'camion_id') attribute = 'immatriculation';
            if (attribute === 'chauffeur_id') attribute = 'nom_chauffeur';
            if (attribute === 'depot_depart_id') attribute = 'intitule_depot_depart';
            if (attribute === 'depot_arrivee_id') attribute = 'intitule_depot_arrivee';
            
            const value = entree[attribute] || '';

            // Si c'est le statut de livraison, ajoute le select et le bouton
            if (attribute === "statut_livraison") {
                const selectId = `statut_livraison_${entree.livraison_id}`;
                contentHTML += `
                    <div class="statut-container">
                        <select class='attribut' name='statut_livraison' id='${selectId}'>
                            <option value='En attente' ${entree.statut_livraison === 'En attente' ? 'selected' : ''}>En attente</option>
                            <option value='En cours' ${entree.statut_livraison === 'En cours' ? 'selected' : ''}>En cours</option>
                            <option value='Terminée' ${entree.statut_livraison === 'Terminée' ? 'selected' : ''}>Terminée</option>
                        </select>
                        <button 
                            class='modifier-btn' 
                            data-livraison-id='${entree.livraison_id}'>
                            Modifier
                        </button>                    
                    </div>`;
            } else {
                contentHTML += `<p class='attribut'>${value}</p>`;  
            }
        });
        contentHTML += `</div>`;
        const tableId = `${table}_id`;  
        const entreeId = entree[`${tableId}`];  
        contentHTML += `
        <button 
            class="delete-btn" 
            data-id="${entreeId}" 
            data-table="${table}">
            Supprimer
        </button>`;
        contentHTML += `</div>`; 
    });

    return contentHTML;
}

// Gestionnaire d'événements global pour les boutons "Modifier"
document.addEventListener('click', function(event) {
    if (event.target.matches('.modifier-btn')) {
        const livraisonId = event.target.getAttribute('data-livraison-id');
        if (livraisonId) {
            updateLivraison(livraisonId);
        }
    }
});

document.addEventListener('click', async function(event) {
    if (event.target.matches('.delete-btn')) {
        const id = event.target.getAttribute('data-id');
        const table = event.target.getAttribute('data-table');

        if (id && table) {
            if (confirm(`Voulez-vous vraiment supprimer cet élément ?`)) {
                try {
                    const response = await fetch(`/api/delete`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, table})
                    });

                    if (!response.ok) throw new Error('Erreur lors de la suppression');
                    alert(`Élément supprimé avec succès`);
                    displayTable(table); // Recharge la table pour refléter les changements
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    alert(`Erreur lors de la suppression de l'élément`);
                }
            }
        }
    }
});

// Fonction updateLivraison modifiée pour une meilleure gestion
function updateLivraison(livraisonId) {
    const selectElement = document.getElementById(`statut_livraison_${livraisonId}`);
    if (!selectElement) {
        console.error(`Élément select introuvable pour livraison ID ${livraisonId}`);
        return;
    }

    const statut = selectElement.value;

    console.log(`Mise à jour du statut pour livraison ID ${livraisonId} avec le statut "${statut}"`);

    fetch(`/api/livraisonUpdate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            livraison_id: livraisonId,
            statut_livraison: statut
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur réseau : ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Statut mis à jour avec succès:', data);
        alert(`Livraison #${livraisonId} mise à jour avec succès au statut "${statut}"`);
    })
    .catch(error => {
        console.error('Erreur lors de la mise à jour:', error);
        alert(`Erreur lors de la mise à jour de la livraison #${livraisonId}.`);
    });
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

//Requetes Spéciales
const selectRequestSpecial = document.getElementById("selectreqspecial"); 
 
async function specialRequests() {
     console.log(selectRequestSpecial.value); 
    if(selectRequestSpecial.value === 'param') {
         console.log('requete paramétrée selectionnée'); 
    }
}
