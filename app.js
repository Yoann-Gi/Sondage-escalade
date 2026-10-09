// ==========================================
// PARTIE 1 : CONFIGURATION ET LOGIQUE DES DONNÉES
// ==========================================

const VACANCES_ZONE_A_2026_2027 = [
    { debut: new Date('2026-10-24'), fin: new Date('2026-11-09') }, // Toussaint
    { debut: new Date('2026-12-19'), fin: new Date('2026-01-04') }, // Noël
    { debut: new Date('2027-02-13'), fin: new Date('2027-03-01') }, // Hiver
    { debut: new Date('2027-04-10'), fin: new Date('2027-04-26') }, // Printemps
    { debut: new Date('2027-07-03'), fin: new Date('2027-09-01') }  // Été
];

const CRENEAUX = ["17h15-18h15", "18h15-19h15", "19h15-20h15"];

let pollData = {
    title: "Encadrement des séances enfants",
    description: "Cochez vos disponibilités pour les séances des vendredis (hors vacances scolaires).",
    propositions: [], 
    participants: []  
};

function genererPropositions() {
    const propositions = [];
    let dateCourante = new Date();
    dateCourante.setHours(0, 0, 0, 0);
    const dateFin = new Date('2027-06-30');

    while (dateCourante.getDay() !== 5) {
        dateCourante.setDate(dateCourante.getDate() + 1);
    }

    while (dateCourante <= dateFin) {
        const estEnVacances = VACANCES_ZONE_A_2026_2027.some(vac => dateCourante >= vac.debut && dateCourante < vac.fin);

        if (!estEnVacances) {
            const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            const dateFormatee = dateCourante.toLocaleDateString('fr-FR', options);
            const dateFormateeCapitalisee = dateFormatee.charAt(0).toUpperCase() + dateFormatee.slice(1);

            CRENEAUX.forEach(creneau => {
                const idProp = `${dateCourante.toISOString().split('T')}_${creneau.replace('h', '')}`;
                propositions.push({
                    id: idProp,
                    dateText: dateFormateeCapitalisee,
                    creneau: creneau
                });
            });
        }
        dateCourante.setDate(dateCourante.getDate() + 7);
    }
    return propositions;
}

function chargerDonnees() {
    const donneesSauvegardees = localStorage.getItem('sondage_escalade_data');
    if (donneesSauvegardees) {
        pollData = JSON.parse(donneesSauvegardees);
        pollData.title = "Encadrement des séances enfants";
    } 
    pollData.propositions = genererPropositions();
    sauvegarderDonnees();
}

function sauvegarderDonnees() {
    localStorage.setItem('sondage_escalade_data', JSON.stringify(pollData));
}

function réinitialiserBoutonCharger() {
    const btnLoad = document.getElementById("btn-load");
    btnLoad.disabled = false;
    btnLoad.style.backgroundColor = "var(--primary-color)";
    btnLoad.style.cursor = "pointer";
}
// ==========================================
// PARTIE 2 : LOGIQUE D'AFFICHAGE ET ÉVÉNEMENTS
// ==========================================

function renderApp() {
    const table = document.getElementById("poll-table");
    const checkboxGroup = document.getElementById("propositions-checkboxes");
    const datalist = document.getElementById("participants-list");

    datalist.innerHTML = pollData.participants.map(p => `<option value="${p.name}"></option>`).join('');

    const listeInscritsParProp = {};
    pollData.propositions.forEach(p => listeInscritsParProp[p.id] = []);
    
    pollData.participants.forEach(part => {
        for (const [idProp, aVote] of Object.entries(part.votes)) {
            if (aVote && listeInscritsParProp[idProp] !== undefined) {
                listeInscritsParProp[idProp].push(part.name);
            }
        }
    });

    let tableHTML = `
        <thead>
            <tr>
                <th>Séance / Vendredi</th>
                <th>17h15-18h15</th>
                <th>18h15-19h15</th>
                <th>19h15-20h15</th>
            </tr>
        </thead>
        <tbody>
    `;

    const datesRegroupees = {};
    pollData.propositions.forEach(p => {
        if (!datesRegroupees[p.dateText]) datesRegroupees[p.dateText] = [];
        datesRegroupees[p.dateText].push(p);
    });

    for (const [dateText, props] of Object.entries(datesRegroupees)) {
        tableHTML += `<tr><td><strong>${dateText}</strong></td>`;
        CRENEAUX.forEach(creneau => {
            const prop = props.find(p => p.creneau === creneau);
            const inscrits = listeInscritsParProp[prop.id] || [];
            const total = inscrits.length;
            
            let classeBadge = 'badge';
            if (total > 0 && total < 3) {
                classeBadge = 'badge insufficient';
            } else if (total >= 3) {
                classeBadge = 'badge validated';
            }
            
            tableHTML += `<td><span class="${classeBadge}" data-id="${prop.id}" style="cursor: ${total > 0 ? 'pointer' : 'default'}">${total} prs</span></td>`;
        });
        tableHTML += `</tr>`;
    }
    tableHTML += `</tbody>`;
    table.innerHTML = tableHTML;

    document.querySelectorAll('.badge').forEach(badge => {
        badge.addEventListener('click', function() {
            const propId = this.getAttribute('data-id');
            const inscrits = listeInscritsParProp[propId] || [];
            if (inscrits.length > 0) {
                ouvrirModale(propId, inscrits);
            }
        });
    });

    let formHTML = `<p class="info-loi">Sélectionnez vos créneaux (Déroulez la liste) :</p>
                    <div class="select-scroll-container">`;
    
    for (const [dateText, props] of Object.entries(datesRegroupees)) {
        formHTML += `<fieldset class="date-fieldset"><legend>${dateText}</legend>`;
        props.forEach(prop => {
            formHTML += `
                <label class="checkbox-label">
                    <input type="checkbox" name="propositions" value="${prop.id}">
                    ${prop.creneau}
                </label>
            `;
        });
        formHTML += `</fieldset>`;
    }
    formHTML += `</div>`;
    checkboxGroup.innerHTML = formHTML;
}

function ouvrirModale(propId, listeNoms) {
    const modal = document.getElementById("modal-participants");
    const title = document.getElementById("modal-title");
    const listContainer = document.getElementById("modal-list");
    
    const prop = pollData.propositions.find(p => p.id === propId);
    title.innerText = `${prop.dateText} à ${prop.creneau}`;
    
    listContainer.innerHTML = listeNoms.map(nom => `<li>👤 ${nom}</li>`).join('');
    modal.style.display = "flex";
}

document.querySelector(".close-modal").addEventListener("click", () => {
    document.getElementById("modal-participants").style.display = "none";
});

window.addEventListener("click", (e) => {
    const modal = document.getElementById("modal-participants");
    if (e.target === modal) {
        modal.style.display = "none";
    }
});
// ==========================================
// PARTIE 3 : SAISIE, CHARGEMENT DU PROFIL ET SOUFFLET
// ==========================================

function chargerVotesUtilisateur() {
    const nomSaisi = document.getElementById("participant-name").value.trim();
    if (!nomSaisi) {
        alert("Veuillez d'abord saisir ou sélectionner un nom.");
        return;
    }

    const checkboxes = document.querySelectorAll('input[name="propositions"]');
    checkboxes.forEach(cb => cb.checked = false);

    const utilisateur = pollData.participants.find(p => p.name.toLowerCase() === nomSaisi.toLowerCase());
    const optionsBlock = document.getElementById("vote-options-block");
    const btnLoad = document.getElementById("btn-load");

    if (utilisateur) {
        checkboxes.forEach(cb => {
            if (utilisateur.votes[cb.value]) {
                cb.checked = true;
            }
        });
        alert(`Bonjour ${utilisateur.name}, vos choix futurs ont été chargés !`);
    } else {
        alert(`Nouveau profil créé pour "${nomSaisi}". Vous pouvez maintenant choisir vos créneaux.`);
    }

    optionsBlock.classList.add("visible");

    // VERROUILLAGE ET COULEUR GRISE DU BOUTON CHARGER
    btnLoad.disabled = true;
    btnLoad.style.backgroundColor = "#bdc3c7"; 
    btnLoad.style.cursor = "not-allowed";
}

document.getElementById("btn-load").addEventListener("click", chargerVotesUtilisateur);

document.getElementById("participant-name").addEventListener("input", function() {
    if (this.value.trim() === "") {
        document.getElementById("vote-options-block").classList.remove("visible");
    }
    réinitialiserBoutonCharger();
});

document.getElementById("vote-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const nomParticipant = document.getElementById("participant-name").value.trim();
    if (!nomParticipant) return;

    const checkboxes = document.querySelectorAll('input[name="propositions"]');
    const votesParticipant = {};
    
    const utilisateurExistant = pollData.participants.find(p => p.name.toLowerCase() === nomParticipant.toLowerCase());
    if (utilisateurExistant) {
        Object.assign(votesParticipant, utilisateurExistant.votes);
    }
    
    checkboxes.forEach(cb => {
        votesParticipant[cb.value] = cb.checked;
    });

    const indexExistant = pollData.participants.findIndex(p => p.name.toLowerCase() === nomParticipant.toLowerCase());
    
    if (indexExistant !== -1) {
        pollData.participants[indexExistant].votes = votesParticipant;
        alert(`Vos modifications ont bien été enregistrées, ${nomParticipant} !`);
    } else {
        pollData.participants.push({
            name: nomParticipant,
            votes: votesParticipant
        });
        alert(`Bienvenue, vos choix ont été pris en compte !`);
    }

    sauvegarderDonnees();
    
    document.getElementById("participant-name").value = "";
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById("vote-options-block").classList.remove("visible");
    
    réinitialiserBoutonCharger();
    renderApp();
});

function initApp() {
    chargerDonnees();
    renderApp();
    réinitialiserBoutonCharger();
}

document.addEventListener("DOMContentLoaded", initApp);
