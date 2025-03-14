import { Client, Databases, Query, Account, ID } from "appwrite";
import themeUtils from './themeUtils.js';
import { RoleAuth } from './roleAuth.js';

const client = new Client()
    .setEndpoint('https://appwrite.bioterms.space/v1')
    .setProject('66bdd9ef0022a854dccc'); // Your Appwrite project ID

const databases = new Databases(client);
const account = new Account(client);
const roleAuth = new RoleAuth();


// IDs for your collections
const termsDatabaseId = '66bddcb3002ce9c16742'; 
const termsCollectionId = '66bddd03002e43f7d4f1'; 
const bookmarksDatabaseId = '66bddcb3002ce9c16742'; 
const bookmarksCollectionId = '67607e0c0013805dde72';  
const userConceptsCollectionId = '676dbc8e00107e180a0c'; 
const userKeysCollectionId = '676dbd9b001599cb2b51';


let favorites = {};
let allDefinitions = [];
let currentPage = 1;
const itemsPerPage = 10;
let userKeys = 0;
let unlockedConcepts = new Set();
let keyDocId = null




// Realtime Subscriptions
const subscribeToRealtime = () => {
    // Subscribe to user concepts changes
    client.subscribe(`databases.${termsDatabaseId}.collections.${userConceptsCollectionId}.documents`, (response) => {
      if (response.events.includes('databases.*.collections.*.documents.*.update')) {
        const { conceptId, isLocked } = response.payload;
        updateLockUI(conceptId, isLocked);
      }
    });
  
    // Subscribe to bookmarks changes
    client.subscribe(`databases.${bookmarksDatabaseId}.collections.${bookmarksCollectionId}.documents`, (response) => {
      const eventType = response.events[0].split('.')[4];
      const payload = response.payload;
  
      if (eventType === 'create') {
        updateBookmarkUI(payload.term, true);
      } else if (eventType === 'delete') {
        updateBookmarkUI(payload.term, false);
      }
    });
  };
  
  // Update lock icons
  const updateLockUI = (conceptId, isLocked) => {
    document.querySelectorAll(`[data-concept-id="${conceptId}"]`).forEach(li => {
      const lockIcon = li.querySelector('.lock-icon');
      if (lockIcon) {
        lockIcon.className = isLocked ? 
          'fa-light fa-lock-keyhole' : 
          'fa-light fa-unlock';
      }
    });
  };
  
  // Update bookmark icons
  const updateBookmarkUI = (term, isBookmarked) => {
    document.querySelectorAll('.term-text').forEach(element => {
      if (element.textContent === term) {
        const bookmarkIcon = element.closest('li').querySelector('.bookmark-icon');
        if (bookmarkIcon) {
          bookmarkIcon.className = isBookmarked ?
            'fa-light fa-bookmark-slash' :
            'fa-light fa-bookmark';
        }
      }
    });
  };


async function updateUserIcon() {
    try {
        const user = await account.get();
        if (user.prefs && user.prefs.profilePictureId) {
            const profileImageUrl = await storage.getFileView(BUCKET_ID, user.prefs.profilePictureId);
            
            // إنشاء عنصر الصورة
            const profileImg = document.createElement('img');
            profileImg.src = profileImageUrl;
            profileImg.style.width = '24px';
            profileImg.style.height = '24px';
            profileImg.style.borderRadius = '50%';
            profileImg.style.objectFit = 'cover';
            
            // العثور على جميع الروابط التي تحتوي على أيقونة المستخدم
            const userLinks = document.querySelectorAll('a#userInfoLink');
            
            userLinks.forEach(link => {
                // إزالة الأيقونة القديمة
                const oldIcon = link.querySelector('i.fa-light.fa-user');
                if (oldIcon) {
                    oldIcon.remove();
                }
                
                // إضافة الصورة الجديدة
                link.appendChild(profileImg.cloneNode(true));
            });
        }
    } catch (error) {
        console.error('خطأ في تحديث أيقونة المستخدم:', error);
    }
}

// استدعاء الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', updateUserIcon);

async function initializeRoleBasedIcons() {
    try {
        const user = await account.get();
        
        // نحصل على دور المستخدم من المجموعة
        const response = await databases.listDocuments(
            termsDatabaseId,
            '678ab074003692c16eb3', // rolesCollectionId 
            [Query.equal('userId', user.$id)]
        );

        const userRole = response.documents.length > 0 ? response.documents[0].role : 'user';

        // نحدد الأيقونات للعرض في كلا التخطيطين
        const desktopAdminIcon = document.querySelector('.desktop-layout .admin-icon-container');
        const desktopUserIcon = document.querySelector('.desktop-layout .user-icon-container');
        const mobileAdminIcon = document.querySelector('.mobile-layout .admin-icon-container');
        const mobileUserIcon = document.querySelector('.mobile-layout .user-icon-container');


        // إضافة event listener لكلا الزرين
document.getElementById('logoutButtonDesktop').addEventListener('click', handleLogout);
document.getElementById('logoutButtonMobile').addEventListener('click', handleLogout);

        // إخفاء جميع الأيقونات أولاً
        [desktopAdminIcon, desktopUserIcon, mobileAdminIcon, mobileUserIcon].forEach(icon => {
            if (icon) icon.style.display = 'none';
        });

        // عرض الأيقونات المناسبة حسب الدور
        if (userRole === 'admin') {
            if (desktopAdminIcon) {
                desktopAdminIcon.style.display = 'block';
                desktopAdminIcon.onclick = () => window.location.href = 'dashboard.html';
            }
            if (mobileAdminIcon) {
                mobileAdminIcon.style.display = 'block';
                mobileAdminIcon.onclick = () => window.location.href = 'dashboard.html';
            }
        } else {
            if (desktopUserIcon) {
                desktopUserIcon.style.display = 'block';
                desktopUserIcon.onclick = () => window.location.href = 'add-concept.html';
            }
            if (mobileUserIcon) {
                mobileUserIcon.style.display = 'block';
                mobileUserIcon.onclick = () => window.location.href = 'add-concept.html';
            }
        }

    } catch (error) {
        console.error('Error initializing role-based icons:', error);
    }
}

// دالة لتحديث الواجهة بناء على الدور
async function updateRoleBasedUI() {
    try {
        const user = await account.get();
        const role = await roleAuth.getUserRole(user.$id);
        
        const isAdmin = role === 'admin';
        
        // تحديث أيقونات Desktop
        const desktopAdminIcon = document.querySelector('.desktop-layout .admin-icon-container');
        const desktopUserIcon = document.querySelector('.desktop-layout .user-icon-container');
        
        // تحديث أيقونات Mobile
        const mobileAdminIcon = document.querySelector('.mobile-layout .admin-icon-container');
        const mobileUserIcon = document.querySelector('.mobile-layout .user-icon-container');
        
        // إخفاء جميع الأيقونات أولاً
        [desktopAdminIcon, desktopUserIcon, mobileAdminIcon, mobileUserIcon].forEach(icon => {
            icon.style.display = 'none';
        });
        
        if (isAdmin) {
            desktopAdminIcon.style.display = 'block';
            mobileAdminIcon.style.display = 'block';
        } else {
            desktopUserIcon.style.display = 'block';
            mobileUserIcon.style.display = 'block';
        }
        
        // إضافة event listeners
        if (isAdmin) {
            desktopAdminIcon.onclick = () => window.location.href = 'dashboard.html';
            mobileAdminIcon.onclick = () => window.location.href = 'dashboard.html';
        } else {
            desktopUserIcon.onclick = () => window.location.href = 'add-concept.html';
            mobileUserIcon.onclick = () => window.location.href = 'add-concept.html';
        }
        
    } catch (error) {
        console.error('Error updating role-based UI:', error);
    }
}

// استدعاء الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthentication();
    await updateRoleBasedUI();
});

document.addEventListener('DOMContentLoaded', async function () {
    const ul = document.querySelector('#definitionsList');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const mediaQueryMobile = window.matchMedia('(max-width: 480px)');
    // Ajouter l'écouteur d'événements pour le bouton de déconnexion
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    try {
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) return;

        const user = await account.get();

        await initializeRoleBasedIcons();
        await initializeUserTerms(user.$id);
        await loadUserTerms(user.$id);
        await loadFavorites();
        fetchDefinitions();
        await checkInitialKeys();

        // Safe event listener addition
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }

        // Safer resize handler
        window.addEventListener('resize', handleLayoutChange);
        handleLayoutChange(); // Initial call
    } catch (error) {
        console.error('Initialization error:', error);
    }
    

    // Récupération des éléments HTML existants
    const searchInputDesktop = document.querySelector('.sidebar .search-bar');
    const searchInputMobile = document.querySelector('.mobile-search-section .search-bar');
    const searchIconDesktop = document.querySelector('.sidebar .search-icon');
    const searchIconMobile = document.querySelector('.mobile-search-section .search-icon');
    const alphabetLinksDesktop = document.querySelectorAll('.sidebar .alphabet-index a');
    const alphabetLinksMobile = document.querySelectorAll('.mobile-search-section .alphabet-index a');

    function waitForElement(selector, callback) {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else {
            setTimeout(function () {
                waitForElement(selector, callback);
            }, 100);
        }
    }

    document.getElementById('favoritesList').addEventListener('click', function (event) {
        const li = event.target.closest('li');
        if (li) {
            const span = li.querySelector('span');
            if (span) {
                const term = span.textContent.trim();
                if (term && favorites[term]) {
                    displayDefinitionInFavorites(term);
                } else {
                    console.error('Invalid term or term not in favorites:', term);
                }
            }
        }
    });

    async function fetchDefinitions() {
        try {
            const response = await databases.listDocuments(termsDatabaseId, termsCollectionId, [Query.limit(100)]);
            allDefinitions = response.documents;
            
            // عرض أول 10 مفاهيم في الوضع المكتبي
            displayDesktopDefinitions(allDefinitions);
            
            // عرض كل المفاهيم في الوضع المحمول (إذا لزم الأمر)
            if (window.innerWidth <= 768) {
                displayMobileDefinitions(allDefinitions);
            }
            
        } catch (error) {
            console.error('فشل جلب البيانات:', error);
            document.querySelectorAll('.term-list').forEach(list => {
              list.innerHTML = '<li>خطأ في تحميل البيانات</li>';
            });
          }
    }

    async function initializeUserTerms(userId) {
        try {
            // Vérifier si l'utilisateur a déjà des clés
            const existingKeys = await databases.listDocuments(termsDatabaseId, userKeysCollectionId, [
                Query.equal('userId', userId)
            ]);
    
            if (existingKeys.documents.length === 0) {
                // Créer un nouveau document pour les clés
                const response = await databases.createDocument(
                    termsDatabaseId, 
                    userKeysCollectionId, 
                    Appwrite.ID.unique(), 
                    {
                        userId: userId,
                        keys: 5,
                        updatedAt: new Date().toISOString()
                    }
                );
                userKeys = 5;
                keyDocId = response.$id;
            } else {
                userKeys = existingKeys.documents[0].keys;
                keyDocId = existingKeys.documents[0].$id;
            }
            
            // Mettre à jour le compteur dans l'interface
            updateKeyCounter(userKeys);
           /*  console.log('Clés initialisées:', userKeys); */
            
            return userKeys;
        } catch (error) {
            console.error("Erreur lors de l'initialisation des termes:", error);
            throw error;
        }
    }
    
    // Charger l'état des termes pour un utilisateur
    async function loadUserTerms(userId) {
        try {
            // Charger les concepts déverrouillés
            const unlockedDocs = await databases.listDocuments(termsDatabaseId, userConceptsCollectionId, [
                Query.equal('userId', userId),
                Query.equal('isLocked', false)
            ]);
    
            unlockedConcepts.clear();
            unlockedDocs.documents.forEach(doc => {
                unlockedConcepts.add(doc.conceptId);
            });
            /* console.log('Concepts déverrouillés chargés:', unlockedConcepts); */
    
            // Charger les clés de l'utilisateur
            const keysDocs = await databases.listDocuments(termsDatabaseId, userKeysCollectionId, [
                Query.equal('userId', userId)
            ]);
    
            if (keysDocs.documents.length > 0) {
                userKeys = keysDocs.documents[0].keys;
                keyDocId = keysDocs.documents[0].$id;
                updateKeyCounter(userKeys);
            }
    
            return {
                unlockedConcepts: Array.from(unlockedConcepts),
                remainingKeys: userKeys
            };
        } catch (error) {
            console.error('Erreur lors du chargement des termes:', error);
            throw error;
        }
    }
    
    
    // Déverrouiller un terme
    async function unlockTerm(userId, conceptId) {
        try {
            // Vérifier si l'utilisateur a assez de clés
            if (userKeys <= 0) {
                showAdModal();
                return false;
            }
    
            // Le reste de la fonction reste inchangé...
            if (unlockedConcepts.has(conceptId)) {
                return true;
            }
    
            await databases.createDocument(
                termsDatabaseId, 
                userConceptsCollectionId, 
                Appwrite.ID.unique(), 
                {
                    userId: userId,
                    conceptId: conceptId,
                    isLocked: false
                }
            );
    
            if (keyDocId) {
                await databases.updateDocument(
                    termsDatabaseId, 
                    userKeysCollectionId, 
                    keyDocId, 
                    {
                        keys: userKeys - 1,
                        updatedAt: new Date().toISOString()
                    }
                );
                userKeys--;
                updateKeyCounter(userKeys);
            }
    
            unlockedConcepts.add(conceptId);
            return true;
        } catch (error) {
            console.error('Erreur lors du déverrouillage du terme:', error);
            throw error;
        }
    }
    
    // Vérifier si un terme est déverrouillé
    function isTermUnlocked(conceptId) {
        return unlockedConcepts.has(conceptId);
    }
    
    // Mettre à jour le compteur de clés dans l'interface
    function updateKeyCounter(count) {
        // Sélectionner tous les count-badge (desktop et mobile)
        const countBadges = document.querySelectorAll('.count-badge');
        
        // Mettre à jour chaque badge
        countBadges.forEach(badge => {
            badge.textContent = count.toString();
        });
    }

    async function initializeUserKeys(userId) {
        try {
            // Vérifier si l'utilisateur a déjà des clés
            const existingKeys = await databases.listDocuments(termsDatabaseId, userKeysCollectionId, [
                Query.equal('userId', userId)
            ]);
    
            // Si l'utilisateur n'a pas de clés, créer un nouveau document avec 5 clés
            if (existingKeys.documents.length === 0) {
                const response = await databases.createDocument(
                    termsDatabaseId, 
                    userKeysCollectionId, 
                    ID.unique(), 
                    {
                        userId: userId,
                        keys: 5, // 5 clés gratuites pour les nouveaux comptes
                        updatedAt: new Date().toISOString()
                    }
                );
                userKeys = 5;
                keyDocId = response.$id;
            } else {
                // Si l'utilisateur existe déjà, récupérer ses clés existantes
                userKeys = existingKeys.documents[0].keys;
                keyDocId = existingKeys.documents[0].$id;
            }
            
            // Mettre à jour l'affichage des compteurs
            updateKeyCounter(userKeys);
            
            return userKeys;
        } catch (error) {
            console.error("Erreur lors de l'initialisation des clés:", error);
            throw error;
        }
    }
    
    // Vérification des clés au chargement de la page
    async function checkInitialKeys() {
        try {
            const user = await account.get();
            await initializeUserKeys(user.$id);
        } catch (error) {
            console.error("Erreur lors de la vérification des clés initiales:", error);
        }
    }
    
    
    // Obtenir le nombre de clés restantes
    function getRemainingKeys() {
        return userKeys;
    }

    function showAdModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Besoin de plus de clés ?</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Vous n'avez plus de clés disponibles. Regardez une courte publicité pour obtenir 5 nouvelles clés !</p>
                    <button class="watch-ad-btn">Regarder la publicité</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    
        // Gérer la fermeture de la modale
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.onclick = function() {
            document.body.removeChild(modal);
        };
    
        // Gérer le clic sur le bouton de publicité
        const watchAdBtn = modal.querySelector('.watch-ad-btn');
        watchAdBtn.onclick = async function() {
            try {
                // Simuler le visionnage d'une publicité
                watchAdBtn.textContent = 'Chargement...';
                watchAdBtn.disabled = true;
                
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simuler un délai
                
                // Mettre à jour les clés de l'utilisateur
                const user = await account.get();
                await updateUserKeys(user.$id, 5);
                
                // Fermer la modale et afficher un message de succès
                document.body.removeChild(modal);
                alert('Félicitations ! Vous avez reçu 5 nouvelles clés !');
            } catch (error) {
                console.error("Erreur lors de l'attribution des clés:", error);
                alert('Une erreur est survenue. Veuillez réessayer.');
            }
        };
    }
    
    // Fonction pour mettre à jour les clés de l'utilisateur
    async function updateUserKeys(userId, additionalKeys) {
        try {
            const newKeyCount = userKeys + additionalKeys;
            await databases.updateDocument(
                termsDatabaseId,
                userKeysCollectionId,
                keyDocId,
                {
                    keys: newKeyCount,
                    updatedAt: new Date().toISOString()
                }
            );
            userKeys = newKeyCount;
            updateKeyCounter(userKeys);
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des clés:', error);
            throw error;
        }
    }
    
    // Modification de la fonction displayDefinitions pour inclure l'état de verrouillage
    function displayDefinitions(page, filteredDefinitions = allDefinitions) {
        const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        displayMobileDefinitions(filteredDefinitions);
    } else {
        currentPage = page;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageDefinitions = filteredDefinitions.slice(startIndex, endIndex);
        displayDesktopDefinitions(pageDefinitions);
    }


    
        waitForElement('#definitionsList', async (ul) => {
            ul.innerHTML = '';
            if (pageDefinitions.length === 0) {
                ul.innerHTML = '<li>Aucun résultat trouvé.</li>';
                return;
            }
    
            for (const def of pageDefinitions) {
                const li = document.createElement('li');
                const isUnlocked = isTermUnlocked(def.$id);
    
                // Créer le conteneur de terme
                const termText = document.createElement('span');
                termText.className = 'term-text';
                termText.textContent = def.term;
    
                // Créer le conteneur d'icônes
                const iconsContainer = document.createElement('div');
                iconsContainer.className = 'icons-container';
    
                // Ajouter l'icône de verrouillage
                const lockIcon = document.createElement('i');
                lockIcon.className = isUnlocked ? 'fa-light fa-unlock' : 'fa-light fa-lock-keyhole';
                
                // Ajouter l'icône de favori
                const bookmarkIcon = document.createElement('i');
                bookmarkIcon.className = favorites[def.term] ? 'fa-light fa-bookmark-slash' : 'fa-light fa-bookmark';
    
                // Ajouter les icônes au conteneur
                iconsContainer.appendChild(lockIcon);
                iconsContainer.appendChild(bookmarkIcon);
    
                // Structurer l'élément de liste
                li.appendChild(termText);
                li.appendChild(iconsContainer);
    
                // Gérer le clic sur le terme
                li.addEventListener('click', async function(event) {
                    if (event.target !== bookmarkIcon) {
                        try {
                            if (isUnlocked) {
                                if (mediaQueryMobile.matches) {
                                    showConceptModal(def.term, def.definition);
                                } else {
                                    displayDefinitionInContent(def.term, def.definition);
                                }
                            } else {
                                const user = await account.get();
                                if (await unlockTerm(user.$id, def.$id)) {
                                    if (mediaQueryMobile.matches) {
                                        showConceptModal(def.term, def.definition);
                                    } else {
                                        displayDefinitionInContent(def.term, def.definition);
                                    }
                                    lockIcon.className = 'fa-light fa-unlock';
                                }
                            }
                        } catch (error) {
                            console.error('Erreur:', error);
                        }
                    }
                });
    
                // Gérer le clic sur l'icône de favori
                // Ajouter ceci au début du fichier, après les imports

            
                // Modifier la gestion des favoris pour utiliser le toast
                bookmarkIcon.addEventListener('click', async function(event) {
                    event.stopPropagation();
                    const isCurrentlyUnlocked = isTermUnlocked(def.$id);
                    
                    if (isCurrentlyUnlocked) {
                        await toggleBookmark(def.term, def.definition);
                        bookmarkIcon.className = favorites[def.term] 
                            ? 'fa-light fa-bookmark-slash' 
                            : 'fa-light fa-bookmark';
                    } else {
                        console.warn("You need to unlock this term first");
                    }
                });
                
                // Add click handler for the bookmark circle icon in both layouts
                document.querySelectorAll('.fa-light fa-circle-bookmark').forEach(icon => {
                    icon.parentElement.addEventListener('click', () => {
                        window.location.href = 'bookmarks.html';
                    });
                });
    
                ul.appendChild(li);
            }
            handleLayoutChange();
        });
    }



    function displayMobileDefinitions(definitions) {
        waitForElement('#mobileDefinitionsList', (mobileList) => {
            mobileList.innerHTML = '';
            if (definitions.length === 0) {
                mobileList.innerHTML = '<li>Aucun résultat trouvé.</li>';
                return;
            }
    
            definitions.forEach(def => {
                const li = createDefinitionListItem(def);
                mobileList.appendChild(li);
            });
        });
    }
    
    function displayDesktopDefinitions(definitions) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageDefinitions = definitions.slice(startIndex, endIndex);
    
        const ul = document.querySelector('#definitionsList');
        if (!ul) return;
    
        ul.innerHTML = '';
        
        pageDefinitions.forEach(def => {
            const li = createDefinitionListItem(def);
            ul.appendChild(li);
        });
        
        createPagination();
        updatePagination();
    }

    function isConceptNew(approvedAt) {
        if (!approvedAt) return false;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const approvedDate = new Date(approvedAt);
        return (Date.now() - approvedDate) < twentyFourHours;
    }
    
    function createDefinitionListItem(def) {
        const li = document.createElement('li');
    li.dataset.conceptId = def.$id;
    const isUnlocked = isTermUnlocked(def.$id);

    const termText = document.createElement('span');
    termText.className = 'term-text';
    termText.textContent = def.term;


    
        if (isConceptNew(def.approvedAt)) {
            const newIcon = document.createElement('i');
            newIcon.className = 'fa-light fa-star new-icon';
            termText.appendChild(newIcon);
        }
    
        const iconsContainer = document.createElement('div');
        iconsContainer.className = 'icons-container';
    
        if (isUnlocked) {
            // إضافة أيقونة الإشارة المرجعية
            const bookmarkIcon = document.createElement('i');
            bookmarkIcon.className = favorites[def.term] 
                ? 'fa-light fa-bookmark-slash' 
                : 'fa-light fa-bookmark';
            bookmarkIcon.classList.add('bookmark-icon');
            iconsContainer.appendChild(bookmarkIcon);
    
            // إضافة مستمع الأحداث للنقر على العنصر
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmark-icon')) {
                    showConceptModal(def.term, def.definition);
                }
            });
    
            // إضافة مستمع الأحداث للنقر على أيقونة الإشارة المرجعية
            bookmarkIcon.addEventListener('click', async (e) => {
                e.stopPropagation();
                await toggleFavorite(def.term, def.definition);
                bookmarkIcon.className = favorites[def.term] 
                    ? 'fa-light fa-bookmark-slash' 
                    : 'fa-light fa-bookmark';
            });
    
            // Click handler for the entire li (except bookmark icon)
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmark-icon')) {
                    if (window.innerWidth <= 768) {
                        showConceptModal(def.term, def.definition);
                    } else {
                        displayDefinitionInContent(def.term, def.definition);
                    }
                }
            });
    
        } else {
            // Add lock icon for locked concepts
            const lockIcon = document.createElement('i');
            lockIcon.className = 'fa-light fa-lock-keyhole';
            lockIcon.classList.add('lock-icon');
            iconsContainer.appendChild(lockIcon);
    
            // Lock icon click handler
            lockIcon.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const user = await account.get();
                    if (await unlockTerm(user.$id, def.$id)) {
                        // Replace lock with bookmark
                        iconsContainer.innerHTML = '';
                        const bookmarkIcon = document.createElement('i');
                        bookmarkIcon.className = 'fa-light fa-bookmark';
                        bookmarkIcon.classList.add('bookmark-icon');
                        iconsContainer.appendChild(bookmarkIcon);
    
                        // Add bookmark click handler
                        bookmarkIcon.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            await toggleFavorite(def.term, def.definition);
                            bookmarkIcon.className = favorites[def.term] 
                                ? 'fa-light fa-bookmark-slash' 
                                : 'fa-light fa-bookmark';
                        });
    
                        // Add click handler to the li after unlocking
                        li.addEventListener('click', (e) => {
                            if (!e.target.closest('.bookmark-icon')) {
                                if (window.innerWidth <= 768) {
                                    showConceptModal(def.term, def.definition);
                                } else {
                                    displayDefinitionInContent(def.term, def.definition);
                                }
                            }
                        });
    
                        // Auto-show definition after unlock
                        if (window.innerWidth <= 768) {
                            showConceptModal(def.term, def.definition);
                        } else {
                            displayDefinitionInContent(def.term, def.definition);
                        }
                    }
                } catch (error) {
                    console.error('Error unlocking term:', error);
                }
            });
        }
    
        li.appendChild(termText);
        li.appendChild(iconsContainer);
        return li;
    }
    
    // Fonction auxiliaire pour vérifier si un terme est déverrouillé
    function isTermUnlocked(conceptId) {
        return unlockedConcepts.has(conceptId);
    }
    
    // Fonction pour mettre à jour l'état de verrouillage
    async function unlockTerm(userId, conceptId) {
        try {
            if (userKeys <= 0) {
                showAdModal();
                return false;
            }
    
            if (unlockedConcepts.has(conceptId)) {
                return true;
            }
    
            await databases.createDocument(
                termsDatabaseId, 
                userConceptsCollectionId, 
                ID.unique(), 
                {
                    userId: userId,
                    conceptId: conceptId,
                    isLocked: false
                }
            );
    
            if (keyDocId) {
                await databases.updateDocument(
                    termsDatabaseId, 
                    userKeysCollectionId, 
                    keyDocId, 
                    {
                        keys: userKeys - 1,
                        updatedAt: new Date().toISOString()
                    }
                );
                userKeys--;
                updateKeyCounter(userKeys);
            }
    
            unlockedConcepts.add(conceptId);
            return true;
        } catch (error) {
            console.error('Erreur lors du déverrouillage du terme:', error);
            return false;
        }
    }

    function createPagination() {
        const totalPages = Math.ceil(allDefinitions.length / itemsPerPage);
        let paginationContainer = document.querySelector('.pagination');
    
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination';
            document.querySelector('.sidebar').appendChild(paginationContainer);
        } else {
            paginationContainer.innerHTML = '';
        }
    
        
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fa-light fa-chevron-left"></i>';
        prevButton.addEventListener('click', () => changePage(currentPage - 1));
        paginationContainer.appendChild(prevButton);
    
        
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = currentPage === i ? 'active' : '';
            pageButton.addEventListener('click', () => changePage(i));
            paginationContainer.appendChild(pageButton);
        }
    
         
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fa-light fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => changePage(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    }

    function changePage(newPage) {
        const totalPages = Math.ceil(allDefinitions.length / itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            displayDesktopDefinitions(allDefinitions);  
        }
    }

    function updatePagination() {
        const totalPages = Math.ceil(allDefinitions.length / itemsPerPage);
        const buttons = document.querySelectorAll('.pagination button');
        
        buttons.forEach((button, index) => {
            if (index === 0) {  
                button.disabled = currentPage === 1;
            } else if (index === buttons.length - 1) {  
                button.disabled = currentPage === totalPages;
            } else { 
                const pageNumber = parseInt(button.textContent);
                button.classList.toggle('active', pageNumber === currentPage);
            }
        });
    }

    function showConceptModal(term, definition) {
        const modal = document.getElementById('conceptModal');
        const modalTerm = document.getElementById('modalTerm');
        const modalDefinition = document.getElementById('modalDefinition');
    
        if (!modal || !modalTerm || !modalDefinition) {
            console.error('العنصر غير موجود في الـ DOM');
            return;
        }
    
        // تحديث المحتوى
        modalTerm.textContent = term;
        modalDefinition.textContent = definition;
    
        // إظهار البطاقة
        modal.style.display = 'block';
    
        // إضافة مستمعي الأحداث للأزرار
        const closeBtn = modal.querySelector('.close-btn');
        const darkModeBtn = modal.querySelector('.dark-mode-toggle');
        const fontIncreaseBtn = modal.querySelector('.font-increase');
        const fontDecreaseBtn = modal.querySelector('.font-decrease');
    
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', toggleDarkMode);
        }
        if (fontIncreaseBtn) {
            fontIncreaseBtn.addEventListener('click', () => changeFontSize(1));
        }
        if (fontDecreaseBtn) {
            fontDecreaseBtn.addEventListener('click', () => changeFontSize(-1));
        }
    }
    
    function closeModal() {
        const modal = document.getElementById('conceptModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    
    function displayDefinitionInContent(term, definition) {
        const content = document.querySelector('.content');
        if (!content) return;
    
        // التحقق من وجود أزرار التحكم
        let buttonContainer = content.querySelector('.definition-buttons');
        if (!buttonContainer) {
            // إنشاء الأزرار إذا لم تكن موجودة
            buttonContainer = document.createElement('div');
            buttonContainer.className = 'definition-buttons';
            buttonContainer.innerHTML = `
                <span id="closeDefinitionBtn" class="definition-btn"><i class="fa-light fa-circle-xmark"></i></span>
                <span id="darkModeToggle" class="definition-btn dark-mode-toggle"><i class="fa-light fa-moon"></i></span>
                <span class="definition-btn">A<sup>+</sup></span>
                <span class="definition-btn">A<sup>-</sup></span>
            `;
            content.appendChild(buttonContainer);
        }
    
        // تحديث المحتوى
        content.innerHTML = `
            <div class="term-container">
                <h2 class="term-title">${term}</h2>
            </div>
            <div class="definition-container">
                <p class="definition-text">${definition}</p>
            </div>
        `;
    
        // إضافة الأزرار إلى المحتوى
        content.appendChild(buttonContainer);
    
        // إضافة مستمعي الأحداث
        document.getElementById('closeDefinitionBtn').addEventListener('click', closeDefinition);
        document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    
        // تحديث وضع الوضع الليلي
        updateDarkModeButton();
    }

    

    function closeDefinition() {
        if (mediaQueryMobile.matches) {
            const modal = document.getElementById('conceptModal');
            modal.style.display = 'none';
            const buttonContainer = modal.querySelector('.definition-buttons');
            if (buttonContainer) {
                buttonContainer.remove();
            }
        } else {
            content.innerHTML = '';
        }
    }

    window.closeModal = closeDefinition;

    window.onclick = function (event) {
        if (mediaQueryMobile.matches) {
            const modal = document.getElementById('conceptModal');
            if (event.target == modal) {
                closeDefinition();
            }
        }
    }

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        updateDarkModeButton();
        updateColors();
        toggleLogo();
    }

    function toggleLogo() {
        const lightModeLogo = document.querySelector('.light-mode-logo');
        const darkModeLogo = document.querySelector('.dark-mode-logo');
        if (document.body.classList.contains('dark-mode')) {
            lightModeLogo.style.display = 'none';
            darkModeLogo.style.display = 'block';
        } else {
            lightModeLogo.style.display = 'block';
            darkModeLogo.style.display = 'none';
        }
    }

    function updateDarkModeButton() {
        const darkModeButtons = document.querySelectorAll('.dark-mode-toggle');
        darkModeButtons.forEach(button => {
            if (document.body.classList.contains('dark-mode')) {
                button.innerHTML = '<i class="fa-light fa-sun-bright"></i>';
                button.title = "Passer en mode clair";
            } else {
                button.innerHTML = '<i class="fa-light fa-moon"></i>';
                button.title = "Passer en mode sombre";
            }
        });
    }

    function updateColors() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        document.documentElement.style.setProperty('--background-color', isDarkMode ? '#333333' : '#ffffff');
        document.documentElement.style.setProperty('--text-color', isDarkMode ? '#ffffff' : '#333333');
    }

    async function toggleFavorite(term, definition) {
        try {
            const user = await account.get();
            const userId = user.$id;
    
            // Find the clicked bookmark icon
            const allListItems = document.querySelectorAll('.term-list li');
            const listItem = Array.from(allListItems).find(li => 
                li.querySelector('.term-text').textContent === term
            );
            const bookmarkIcon = listItem ? listItem.querySelector('.fa-bookmark, .fa-bookmark-slash') : null;
    
            // Check if bookmark exists
            const response = await databases.listDocuments(
                bookmarksDatabaseId,
                bookmarksCollectionId,
                [
                    Query.equal('userId', userId),
                    Query.equal('term', term)
                ]
            );
    
            if (response.documents.length > 0) {
                // Remove bookmark
                await databases.deleteDocument(
                    bookmarksDatabaseId,
                    bookmarksCollectionId,
                    response.documents[0].$id
                );
                delete favorites[term];
                
                // Update icon immediately
                if (bookmarkIcon) {
                    bookmarkIcon.className = 'fa-light fa-bookmark';
                }
                
               
            } else {
                // Add new bookmark
                const bookmark = await databases.createDocument(
                    bookmarksDatabaseId,
                    bookmarksCollectionId,
                    ID.unique(),
                    {
                        userId: userId,
                        term: term,
                        definition: definition
                    }
                );
                favorites[term] = bookmark;
                
                // Update icon immediately
                if (bookmarkIcon) {
                    bookmarkIcon.className = 'fa-light fa-bookmark-slash';
                }
                
                 
            }
    
            // Update all instances of this term's bookmark icon
            document.querySelectorAll('.term-list li').forEach(li => {
                const termText = li.querySelector('.term-text');
                if (termText && termText.textContent === term) {
                    const icon = li.querySelector('.fa-bookmark, .fa-bookmark-slash');
                    if (icon) {
                        icon.className = favorites[term] ? 'fa-light fa-bookmark-slash' : 'fa-light fa-bookmark';
                    }
                }
            });
    
            // Notify other pages of the update
            localStorage.setItem('bookmarksUpdated', Date.now());
        } catch (error) {
            console.error('Erreur dans la gestion des signets :', error);
            console.error('Operation error');
        }
    }
    

    function updateFavoriteIcons() {
        document.querySelectorAll('.term-list li').forEach(li => {
            const term = li.querySelector('.term-text').textContent;
            const icon = li.querySelector('.bookmark-icon, .delete-icon');
            if (favorites[term]) {
                icon.className = 'fa-light fa-bookmark-slash';
            } else {
                icon.className = 'fa-light fa-bookmark';
            }
        });
    }

    async function loadFavorites() {
        try {
            const user = await account.get();
            const userId = user.$id;

            const response = await databases.listDocuments(bookmarksDatabaseId, bookmarksCollectionId, [
                Query.equal('userId', userId),
            ]);

            response.documents.forEach(doc => {
                favorites[doc.term] = doc;
            });

            updateFavoriteIcons();
        } catch (error) {
            console.error('Erreur lors du chargement des favoris:', error);
        }
    }

    function showFavoritesPage() {
        document.getElementById('favoritesPage').style.display = 'block';

        const favoritesList = document.getElementById('favoritesList');
        favoritesList.innerHTML = '';
        Object.entries(favorites).forEach(([term, value]) => {
            if (term && value && value.definition) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${term}</span>
                    <i class="fa-light fa-bookmark-slash" onclick="removeFavorite('${term}')"></i>
                `;
                favoritesList.appendChild(li);
            }
        });
    }

    function hideFavoritesPage() {
        document.getElementById('favoritesPage').style.display = 'none';
    }

    function removeFavorite(term) {
        if (favorites[term]) {
            delete favorites[term];
            saveFavoritesToLocalStorage();
            showFavoritesPage();
        }
    }

    function displayDefinitionInFavorites(term) {
        if (term && favorites[term] && favorites[term].definition) {
            const definitionDisplay = document.querySelector('#favoritesPage .definition-display');

            if (window.innerWidth <= 480) {
                showFavoriteModal(term, favorites[term].definition);
            } else {
                definitionDisplay.innerHTML = `
                    <div class="term-container">
                        <h2 class="term-title">${term}</h2>
                    </div>
                    <div class="definition-container">
                        <p class="definition-text">${favorites[term].definition}</p>
                    </div>
                    <div class="definition-buttons">
                        <span id="closeDefinitionBtn" class="definition-btn"><i class="fa-light fa-circle-xmark"></i></span>
                        <span id="darkModeToggle" class="definition-btn dark-mode-toggle"><i class="fa-light fa-moon"></i></span>
                        <span class="definition-btn font-increase">A<sup>+</sup></span>
                        <span class="definition-btn font-decrease">A<sup>-</sup></span>
                    </div>
                `;

                document.getElementById('closeDefinitionBtn').addEventListener('click', clearDefinitionDisplay);
                document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
                document.querySelector('.font-increase').addEventListener('click', increaseFontSize);
                document.querySelector('.font-decrease').addEventListener('click', decreaseFontSize);

                updateDarkModeButton();
            }
        } else {
            console.error('Définition non trouvée pour le terme:', term);
        }
    }

    function clearDefinitionDisplay() {
        const definitionDisplay = document.querySelector('#favoritesPage .definition-display');
        definitionDisplay.innerHTML = '';
    }

    function increaseFontSize() {
        changeFontSize(1);
    }

    function decreaseFontSize() {
        changeFontSize(-1);
    }

    function changeFontSize(change) {
        const definitionText = document.querySelector('.definition-text');
        if (definitionText) {
            let currentSize = window.getComputedStyle(definitionText).fontSize;
            let newSize = parseFloat(currentSize) + change;
            definitionText.style.fontSize = `${newSize}px`;
        }
    }

    function filterByLetter(letter) {
        const filteredDefinitions = allDefinitions.filter(def => def.term.toUpperCase().startsWith(letter));
        displayDefinitions(1, filteredDefinitions);
    }

    function searchTerms(query) {
        if (query === '') {
            displayDefinitions(1);
        } else {
            const filteredDefinitions = allDefinitions.filter(def => def.term.toLowerCase().includes(query.toLowerCase()));
            displayDefinitions(1, filteredDefinitions);
        }
    }

    // Écouteurs d'événements pour la recherche et le filtrage
    searchInputDesktop.addEventListener('input', () => {
        const query = searchInputDesktop.value.trim();
        searchTerms(query);

        // Remplacer l'icône de recherche par l'icône de suppression si le champ n'est pas vide
        if (query) {
            searchIconDesktop.className = 'fa-light fa-xmark search-icon';
        } else {
            searchIconDesktop.className = 'fa-light fa-magnifying-glass search-icon';
        }
    });

    searchInputMobile.addEventListener('input', () => {
        const query = searchInputMobile.value.trim();
        searchTerms(query);

        // Remplacer l'icône de recherche par l'icône de suppression si le champ n'est pas vide
        if (query) {
            searchIconMobile.className = 'fa-light fa-xmark search-icon';
        } else {
            searchIconMobile.className = 'fa-light fa-magnifying-glass search-icon';
        }
    });

    // Effacer le contenu de la barre de recherche lorsque l'icône de suppression est cliquée
    searchIconDesktop.addEventListener('click', () => {
        searchInputDesktop.value = '';
        searchIconDesktop.className = 'fa-light fa-magnifying-glass search-icon';
        searchTerms('');
    });

    searchIconMobile.addEventListener('click', () => {
        searchInputMobile.value = '';
        searchIconMobile.className = 'fa-light fa-magnifying-glass search-icon';
        searchTerms('');
    });

    alphabetLinksDesktop.forEach(link => {
        let isFiltered = false;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            if (isFiltered) {
                displayDefinitions(1); // Réinitialiser le filtrage
                isFiltered = false;
            } else {
                filterByLetter(link.textContent);
                isFiltered = true;
            }
        });
    });

    alphabetLinksMobile.forEach(link => {
        let isFiltered = false;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            if (isFiltered) {
                displayDefinitions(1); // Réinitialiser le filtrage
                isFiltered = false;
            } else {
                filterByLetter(link.textContent);
                isFiltered = true;
            }
        });
    });

    mediaQueryMobile.addEventListener('change', handleLayoutChange);

    loadFavorites();

    document.querySelector('.save-button').addEventListener('click', showFavoritesPage);
    document.querySelector('.back-button').addEventListener('click', hideFavoritesPage);

    fetchDefinitions();
    updateDarkModeButton();
    updateColors();
    toggleLogo();
    window.addEventListener('resize', handleLayoutChange);
    handleLayoutChange();
    subscribeToRealtime();
    await loadInitialData();
});

window.addEventListener('popstate', async function(event) {
    // Vérifier l'authentification à chaque changement d'URL
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        event.preventDefault();
        window.location.href = 'login.html';
    }
});

window.removeFavorite = function (term) {
    if (term in favorites) {
        delete favorites[term];
        saveFavoritesToLocalStorage();
        showFavoritesPage();
    }
};

const loadInitialData = async () => {
    try {
      const user = await account.get();
      localStorage.setItem('userId', user.$id);
      
      const [definitions, concepts] = await Promise.all([
        databases.listDocuments(termsDatabaseId, termsCollectionId),
        databases.listDocuments(termsDatabaseId, userConceptsCollectionId, [
          Query.equal('userId', user.$id)
        ])
      ]);
      
      // معالجة البيانات...
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };


function handleLayoutChange() {
    const mobileLayout = document.querySelector('.mobile-layout');
    const desktopLayout = document.querySelector('.desktop-layout');
    
    if (!mobileLayout || !desktopLayout) return;

    const isMobile = window.innerWidth <= 768;
    
    mobileLayout.style.display = isMobile ? 'block' : 'none';
    desktopLayout.style.display = isMobile ? 'none' : 'block';

     
    if (isMobile) {
        initializeMobileList();
    } else {
        initializeDesktopList();
    }
}

function initializeMobileList() {
    const mobileList = document.querySelector('.mobile-layout #mobileDefinitionsList');
    if (mobileList && mobileList.children.length === 0) {
        // Populate mobile list from desktop list or fetch again
        const desktopList = document.querySelector('.desktop-layout #definitionsList');
        if (desktopList) {
            mobileList.innerHTML = desktopList.innerHTML;
        } else {
            fetchDefinitions(); // Re-fetch if no list exists
        }
    }
}

function initializeDesktopList() {
    const desktopList = document.querySelector('.desktop-layout #definitionsList');
    if (desktopList && desktopList.children.length === 0) {
        // إعادة تحميل البيانات عند التهيئة
        fetchDefinitions();
    }
}

function showFavoriteModal(term, definition) {
    const modal = document.createElement('div');
    modal.className = 'favorite-modal';
    modal.innerHTML = `
        <div class="favorite-modal-content">
            <h2>${term}</h2>
            <p>${definition}</p>
            <div class="definition-buttons">
                <span id="closeDefinitionBtn" class="definition-btn" title="Fermer la définition">
                    <i class="fa-light fa-circle-xmark"></i>
                </span>
                <span id="darkModeToggle" class="definition-btn dark-mode-toggle" title="Basculer le mode sombre/clair">
                    <i class="fa-light fa-moon"></i>
                </span>
                <span class="definition-btn font-increase" title="Augmenter la taille du texte">
                    A<sup>+</sup>
                </span>
                <span class="definition-btn font-decrease" title="Diminuer la taille du texte">
                    A<sup>-</sup>
                </span>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#closeDefinitionBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#darkModeToggle').addEventListener('click', themeUtils.toggleDarkMode.bind(themeUtils));

    modal.querySelector('.font-increase').addEventListener('click', () => themeUtils.changeFontSize(1));
    modal.querySelector('.font-decrease').addEventListener('click', () => themeUtils.changeFontSize(-1));

    themeUtils.updateDarkModeButton();
}

// دالة عرض التعريف
function showMobileModal(term, definition) {
    const overlay = document.querySelector('.mobile-modal-overlay');
    const modal = document.querySelector('.mobile-modal');
    const termElement = document.getElementById('mobileModalTerm');
    const definitionElement = document.getElementById('mobileModalDefinition');
    
    termElement.textContent = term;
    definitionElement.textContent = definition;
    
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    
    // إضافة إمكانية الإغلاق بالنقر خارج البطاقة
    overlay.addEventListener('click', closeMobileModal);
}

// دالة إغلاق البطاقة
function closeMobileModal() {
    const overlay = document.querySelector('.mobile-modal-overlay');
    const modal = document.querySelector('.mobile-modal');
    
    overlay.style.display = 'none';
    modal.style.display = 'none';
    
    // إزالة مستمع الأحداث لمنع التكرار
    overlay.removeEventListener('click', closeMobileModal);
}

// إضافة مستمعي الأحداث للأزرار
document.querySelector('.close-btn').addEventListener('click', closeMobileModal);
document.querySelector('.bookmark-btn').addEventListener('click', function() {
    const term = document.getElementById('mobileModalTerm').textContent;
    const definition = document.getElementById('mobileModalDefinition').textContent;
    toggleFavorite(term, definition);
});

// تعديل دالة النقر على العناصر في القائمة
document.querySelectorAll('.term-list li').forEach(li => {
    li.addEventListener('click', function() {
        const term = this.querySelector('.term-text').textContent;
        const definition = "التعريف هنا..."; // استبدل بالمصدر الحقيقي للتعريف
        showMobileModal(term, definition);
    });
});

function updateDarkModeButton(button) {
    if (button) {
        const isDarkMode = document.body.classList.contains('dark-mode');
        button.innerHTML = isDarkMode
            ? '<i class="fa-light fa-sun"></i>'
            : '<i class="fa-light fa-moon"></i>';
        button.title = isDarkMode ? "Passer en mode clair" : "Passer en mode sombre";
    }
}

window.addEventListener('resize', function () {
    const definitionDisplay = document.querySelector('#favoritesPage .definition-display');
    if (window.innerWidth <= 480) {
        definitionDisplay.style.display = 'none';
    } else {
        definitionDisplay.style.display = 'block';
    }
});

async function handleLogout() {
    try {
        await account.deleteSession('current');
        localStorage.removeItem('userId');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        showToast('Erreur lors de la déconnexion. Veuillez réessayer.', 'error');
    }
}

// Modification de la fonction checkAuthentication existante
async function checkAuthentication() {
    try {
        const user = await account.get();
        
        if (!user.emailVerification) {
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// Appeler la fonction de vérification au chargement
window.onload = checkAuthentication;