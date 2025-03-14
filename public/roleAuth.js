/* // roleAuth.js
import { Client, Databases, Query, ID } from "appwrite";

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('66bdd9ef0022a854dccc');

export class RoleAuth {
    constructor() {
        this.databases = new Databases(client);
        this.termsDatabaseId = '66bddcb3002ce9c16742';
        this.rolesCollectionId = '678ab074003692c16eb3';
    }

    async getUserRole(userId) {
        try {
            const response = await this.databases.listDocuments(
                this.termsDatabaseId,
                this.rolesCollectionId,
                [Query.equal('userId', userId)]
            );

            if (response.documents.length > 0) {
                return response.documents[0].role;
            }
            
            await this.createUserRole(userId, 'user');
            return 'user';
        } catch (error) {
            console.error('Error fetching user role:', error);
            return 'user';
        }
    }

    async createUserRole(userId, role = 'user') {
        try {
            await this.databases.createDocument(
                this.termsDatabaseId,
                this.rolesCollectionId,
                ID.unique(),
                {
                    userId: userId,
                    role: role,
                    createdAt: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('Error creating user role:', error);
        }
    }


    async isAdmin(userId) {
        const role = await this.getUserRole(userId);
        return role === 'admin';
    }

    getPermissionsForRole(isAdmin) {
        if (isAdmin) {
            return {
                terms: {
                    create: true,
                    read: true,
                    update: true,
                    delete: true
                },
                users: {
                    create: true,
                    read: true,
                    update: true,
                    delete: true
                }
            };
        }
        
        return {
            terms: {
                create: false,
                read: true,
                update: false,
                delete: false
            },
            users: {
                create: false,
                read: false,
                update: false,
                delete: false
            }
        };
    }
}



// تحديث دالة التحقق من المصادقة لتشمل التحقق من الدور
async function checkAuthentication() {
    try {
        const user = await account.get();
        
        if (!user.emailVerification) {
            window.location.href = 'login.html';
            return false;
        }

        // التحقق من دور المستخدم وتحديث واجهة المستخدم
        const userRole = await roleAuth.getUserRole(user.$id);
        updateUIBasedOnRole(userRole === 'user');
        
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// دالة جديدة لتحديث واجهة المستخدم بناءً على الدور
function updateUIBasedOnRole(isUser) {
    // تحديث العناصر في Desktop Layout
    const desktopUserContainer = document.querySelector('.desktop-layout .user-icon-container');
    if (desktopUserContainer) {
        desktopUserContainer.style.display = isUser ? 'inline-block' : 'none';
    }

    // تحديث العناصر في Mobile Layout
    const mobileUserContainer = document.querySelector('.mobile-layout .user-icon-container');
    if (mobileUserContainer) {
        mobileUserContainer.style.display = isUser ? 'inline-block' : 'none';
    }

    // إخفاء أيقونات المشرف في كلا التخطيطين إذا كان المستخدم عادياً
    const adminContainers = document.querySelectorAll('.admin-icon-container');
    adminContainers.forEach(container => {
        container.style.display = 'none';
    });
}

// تحديث مستمعات الأحداث للأزرار الجديدة
document.addEventListener('DOMContentLoaded', async function() {
    // إضافة مستمعات الأحداث للأزرار في Desktop Layout
    const desktopUserBtn = document.querySelector('.desktop-layout .user-icon-container');
    if (desktopUserBtn) {
        desktopUserBtn.addEventListener('click', handleUserAction);
    }

    // إضافة مستمعات الأحداث للأزرار في Mobile Layout
    const mobileUserBtn = document.querySelector('.mobile-layout .user-icon-container');
    if (mobileUserBtn) {
        mobileUserBtn.addEventListener('click', handleUserAction);
    }
});

// دالة معالجة النقر على زر المستخدم
function handleUserAction() {
    // هنا يمكنك إضافة الوظائف التي تريد تنفيذها عند النقر على زر المستخدم
    console.log('User action triggered');
    // مثال: فتح نافذة منبثقة أو تنفيذ إجراء معين
}

export default RoleAuth; */

// roleAuth.js
// roleAuth.js
import { Client, Databases, Query, ID } from "appwrite";

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('66bdd9ef0022a854dccc');

export class RoleAuth {
    constructor() {
        this.databases = new Databases(client);
        this.termsDatabaseId = '66bddcb3002ce9c16742';
        this.rolesCollectionId = '678ab074003692c16eb3';
    }

    async getUserRole(userId) {
        try {
            const response = await this.databases.listDocuments(
                this.termsDatabaseId,
                this.rolesCollectionId,
                [Query.equal('userId', userId)]
            );

            if (response.documents.length > 0) {
                return response.documents[0].role;
            }

            await this.createUserRole(userId, 'user');
            return 'user';
        } catch (error) {
            console.error('Error fetching user role:', error);
            return 'user';
        }
    }

    async createUserRole(userId, role = 'user', email = '', nom = '') {
        try {
            await this.databases.createDocument(
                this.termsDatabaseId,
                this.rolesCollectionId,
                ID.unique(),
                {
                    userId: userId,
                    role: role,
                    email: email,
                    name: nom,
                    createdAt: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('Error creating user role:', error);
        }
    }
}
