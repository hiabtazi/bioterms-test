/* bookmarks.js */
import { Client, Databases, Account, Query } from "appwrite";
import { ID } from "appwrite";

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('66bdd9ef0022a854dccc');

const databases = new Databases(client);
const account = new Account(client);

const bookmarksDatabaseId = '66bddcb3002ce9c16742';
const bookmarksCollectionId = '67607e0c0013805dde72';

let currentPage = 1;
const itemsPerPage = 10;
let bookmarkedTerms = [];
let lastRemovedBookmark = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await checkAuthentication();
        await loadBookmarks();
        handleLayoutChange();
    } catch (error) {
        console.error('Error initializing bookmarks:', error);
    }

    // Event Listeners
    document.querySelectorAll('.back-button').forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    });

    window.addEventListener('resize', handleLayoutChange);
});

function createNotification(message, undoCallback) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="undo-button">Annuler</button>
        </div>
    `;

    document.body.appendChild(notification);

    notification.querySelector('.undo-button').addEventListener('click', () => {
        undoCallback();
        notification.remove();
    });

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// This is the existing removeBookmark function modified to include the new functionality
async function removeBookmark(bookmarkId) {
    try {
        const bookmarkToRemove = bookmarkedTerms.find(b => b.$id === bookmarkId);
        if (!bookmarkToRemove) return;

        // الحذف من قاعدة البيانات
        await databases.deleteDocument(
            bookmarksDatabaseId,
            bookmarksCollectionId,
            bookmarkId
        );

        // تحديث القائمة المحلية
        bookmarkedTerms = bookmarkedTerms.filter(b => b.$id !== bookmarkId);
        
        // إرسال إشعار التحديث
        localStorage.setItem('bookmarksUpdated', Date.now());
        displayBookmarks();

        // عرض إشعار التراجع
        createNotification(
            `A été supprimé ${bookmarkToRemove.term}`,
            async () => await restoreBookmark(bookmarkToRemove)
        );
    } catch (error) {
        console.error('Le signet a été ajouté :', error);
    }
}

async function restoreBookmark(bookmark) {
    try {
        const user = await account.get();
        const restored = await databases.createDocument(
            bookmarksDatabaseId,
            bookmarksCollectionId,
            ID.unique(),
            {
                userId: user.$id,
                term: bookmark.term,
                definition: bookmark.definition
            }
        );

        bookmarkedTerms.push(restored);
        localStorage.setItem('bookmarksUpdated', Date.now());
        displayBookmarks();
    } catch (error) {
        console.error('Erreur lors de la restauration:', error);
    }
}

async function checkAuthentication() {
    try {
        await account.get();
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

async function loadBookmarks() {
    try {
        const user = await account.get(); // Get current logged-in user
        const response = await databases.listDocuments(
            bookmarksDatabaseId,
            bookmarksCollectionId,
            [
                Query.equal('userId', user.$id) // Filter documents by current user's ID
            ]
        );

        bookmarkedTerms = response.documents;
        displayBookmarks();
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        if (error.code === 401) {
            // User is not authenticated
            window.location.href = 'login.html';
        }
    }
}

function displayBookmarks() {
    const isMobile = window.innerWidth <= 768;
    const listElement = isMobile ? 
        document.getElementById('mobileBookmarksList') : 
        document.getElementById('desktopBookmarksList');

    if (!listElement) return;

    listElement.innerHTML = '';

    if (bookmarkedTerms.length === 0) {
        listElement.innerHTML = '<li>Aucun favori trouvé.</li>';
        return;
    }

    if (isMobile) {
        displayMobileBookmarks(listElement);
    } else {
        displayDesktopBookmarks(listElement);
    }
}

function displayMobileBookmarks(listElement) {
    bookmarkedTerms.forEach(bookmark => {
        const li = createBookmarkListItem(bookmark);
        listElement.appendChild(li);
    });
}

function displayDesktopBookmarks(listElement) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageBookmarks = bookmarkedTerms.slice(startIndex, endIndex);

    pageBookmarks.forEach(bookmark => {
        const li = createBookmarkListItem(bookmark);
        listElement.appendChild(li);
    });

    if (bookmarkedTerms.length > itemsPerPage) {
        createPagination();
    }
}

function createBookmarkListItem(bookmark) {
    const li = document.createElement('li');
    
    // Texte du terme
    const termText = document.createElement('span');
    termText.className = 'term-text';
    termText.textContent = bookmark.term;

    // Icône de suppression
    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'fa-light fa-bookmark-slash';

    // Ajout des éléments
    li.appendChild(termText);
    li.appendChild(deleteIcon);

    // Gestion du clic
    li.addEventListener('click', (e) => {
        if (!e.target.classList.contains('fa-bookmark-slash')) {
            // Vérifier si on est dans le layout mobile ou desktop
            const isMobileList = e.currentTarget.closest('#mobileBookmarksList');
            
            if (isMobileList) {
                // Afficher la modal pour mobile
                showConceptModal(bookmark.term, bookmark.definition);
            } else {
                // Afficher dans le content pour desktop
                displayDefinitionInContent(bookmark.term, bookmark.definition);
            }
        }
    });

    deleteIcon.addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeBookmark(bookmark.$id);
    });

    return li;
}


function showConceptModal(term, definition) {
    const modal = document.getElementById('conceptModal');
    const modalTerm = document.getElementById('modalTerm');
    const modalDefinition = document.getElementById('modalDefinition');

    // Vérifier si nous sommes en mode mobile
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return; // Ne pas afficher la modal en mode desktop

    // Afficher le terme et la définition dans la modale
    modalTerm.textContent = term;
    modalDefinition.textContent = definition;

    // Afficher la modale
    modal.style.display = 'block';

    // Fermer la modale si l'utilisateur clique en dehors
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function displayDefinitionInContent(term, definition) {
    // Vérifier si nous sommes en mode desktop
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return; // Ne pas afficher dans le content en mode mobile

    const content = document.querySelector('.desktop-layout .content');
    content.innerHTML = `
        <div class="term-container">
            <h2 class="term-title">${term}</h2>
        </div>
        <div class="definition-container">
            <p class="definition-text">${definition}</p>
        </div>
        <div class="definition-buttons">
            <span id="closeDefinitionBtn" class="definition-btn">
                <i class="fa-light fa-circle-xmark"></i>
            </span>
            <span id="darkModeToggle" class="definition-btn dark-mode-toggle">
                <i class="fa-light fa-moon"></i>
            </span>
        </div>
    `;

    document.getElementById('closeDefinitionBtn').addEventListener('click', () => {
        content.innerHTML = ''; // Vide le contenu quand on ferme
    });
}

function createPagination() {
    const totalPages = Math.ceil(bookmarkedTerms.length / itemsPerPage);
    let paginationContainer = document.querySelector('.pagination');

    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        document.querySelector('.sidebar').appendChild(paginationContainer);
    } else {
        paginationContainer.innerHTML = '';
    }

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fa-light fa-chevron-left"></i>';
    prevButton.addEventListener('click', () => changePage(currentPage - 1));
    paginationContainer.appendChild(prevButton);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = currentPage === i ? 'active' : '';
        pageButton.addEventListener('click', () => changePage(i));
        paginationContainer.appendChild(pageButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fa-light fa-chevron-right"></i>';
    nextButton.addEventListener('click', () => changePage(currentPage + 1));
    paginationContainer.appendChild(nextButton);
}

function changePage(newPage) {
    const totalPages = Math.ceil(bookmarkedTerms.length / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayBookmarks();
    }
}

function handleLayoutChange() {
    const mobileLayout = document.querySelector('.mobile-layout');
    const desktopLayout = document.querySelector('.desktop-layout');
    
    if (!mobileLayout || !desktopLayout) return;

    const isMobile = window.innerWidth <= 768;
    mobileLayout.style.display = isMobile ? 'block' : 'none';
    desktopLayout.style.display = isMobile ? 'none' : 'block';

    displayBookmarks();
}