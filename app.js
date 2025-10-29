import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDNFXDOeaQ5nD5mAulQEt2ZU0gOpXL5hso",
    authDomain: "gaza-universities-data.firebaseapp.com",
    databaseURL: "https://gaza-universities-data-default-rtdb.firebaseio.com",
    projectId: "gaza-universities-data",
    storageBucket: "gaza-universities-data.firebasestorage.app",
    messagingSenderId: "490804195075",
    appId: "1:490804195075:web:ca8ad3247ad5c15c8bc336"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence)
    .then(() => {
        console.log('Session persistence set to browser session');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });
const state = {
    allData: {},
    currentView: 'universities',
    selectedUniKey: null,
    selectedCollegeKey: null,
    selectedMajorName: null,
    searchTerm: '',
    isAuthenticated: false,
    adminUser: null,
};
function saveState() {
    if (state.isAuthenticated && 
        state.currentView.startsWith('admin') && 
        state.currentView !== 'admin_login') {
        sessionStorage.setItem('appState', JSON.stringify({
            currentView: state.currentView,
            selectedUniKey: state.selectedUniKey,
            selectedCollegeKey: state.selectedCollegeKey
        }));
    } else {
        sessionStorage.removeItem('appState');
    }
}


function restoreState() {
    const savedState = sessionStorage.getItem('appState');
    if (savedState && state.isAuthenticated) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed.currentView && parsed.currentView.startsWith('admin')) {
                state.currentView = parsed.currentView;
                state.selectedUniKey = parsed.selectedUniKey;
                state.selectedCollegeKey = parsed.selectedCollegeKey;
            }
        } catch (error) {
            console.error('خطأ في استعادة الحالة:', error);
            sessionStorage.removeItem('appState');
        }
    }
}




const elements = {
    content: document.getElementById('content'),
    backButton: document.getElementById('back-button'),
    searchInput: document.getElementById('search-input'),
    controlsSection: document.getElementById('controls-section'),
    authButton: document.getElementById('auth-button'),
    adminBackButton: document.getElementById('admin-back-button'),
    appContainer: document.getElementById('app-container'),
    addMajorModal: document.getElementById('add-major-modal'),
    addUniModal: document.getElementById('add-uni-modal'),
};



window.navigate = function (view, uniKey = null, collegeKey = null, majorName = null) {
    state.currentView = view;
    if (uniKey !== null) state.selectedUniKey = uniKey;
    if (collegeKey !== null) state.selectedCollegeKey = collegeKey;
    if (view === 'universities') {
        state.selectedUniKey = null;
        state.selectedCollegeKey = null;
    }
    if (view === 'colleges') {
        state.selectedCollegeKey = null;
    }
    state.selectedMajorName = majorName;
    saveState();
    render();
};


window.handleSearch = function () {
    state.searchTerm = elements.searchInput.value.trim().toLowerCase();
    render();
};

function updateAuthButton() {
    if (state.isAuthenticated) {
        elements.authButton.textContent = 'تسجيل الخروج';
        elements.authButton.className = 'bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition duration-150 shadow-md';
    } else {
        elements.authButton.textContent = 'لوحة الإدارة';
        elements.authButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition duration-150 shadow-md';
    }
}

window.handleAuthClick = function () {
    if (state.isAuthenticated) {
        signOut(auth).then(() => {
            navigate('universities');
        }).catch((error) => {
            console.error("Logout Error:", error);
        });
    } else {
        navigate('admin_login');
    }
};

onAuthStateChanged(auth, (user) => {
    state.isAuthenticated = !!user;
    state.adminUser = user;
    
    if (user) {
        restoreState();
        
        if (state.currentView === 'admin_login') {
            state.currentView = 'admin_panel';
        }
    } else {
        sessionStorage.removeItem('appState');
        if (state.currentView.startsWith('admin')) {
            state.currentView = 'universities';
        }
    }
    
    updateAuthButton();
    render();
});

window.handleLogin = function (event) {
    event.preventDefault();

    const messageElement = document.getElementById('login-message');
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    messageElement.textContent = 'جارٍ تسجيل الدخول...';
    messageElement.className = 'text-center mt-4 text-blue-500';

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            messageElement.textContent = 'تم تسجيل الدخول بنجاح!';
            messageElement.className = 'text-center mt-4 text-green-500';
        })
        .catch((error) => {
            const errorCode = error.code;
            let errorMessage = 'فشل تسجيل الدخول.';

            if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
                errorMessage = '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة.';

            } else if (errorCode === 'auth/invalid-email') {
                errorMessage = '❌ صيغة البريد الإلكتروني غير صالحة.';

            } else if (errorCode === 'auth/too-many-requests') {
                errorMessage = '❌ تم حظرك مؤقتاً بسبب كثرة المحاولات. حاول لاحقاً.';
            }

            messageElement.textContent = errorMessage;
            messageElement.className = 'text-center mt-4 text-red-500 font-bold';
            console.error("Login Error:", error);
        });
};



function render() {
    elements.content.innerHTML = '';
    elements.backButton.classList.add('hidden');

    if (state.currentView === 'admin_edit_uni') {
        elements.adminBackButton.classList.remove('hidden');
    } else {
        elements.adminBackButton.classList.add('hidden');
    }

    const isPublicView = state.currentView === 'universities' || state.currentView === 'colleges' || state.currentView === 'majors' || state.currentView === 'plan';

    if (isPublicView && state.currentView !== 'plan') {
        elements.controlsSection.classList.remove('hidden');
        if (state.currentView === 'majors') {
            elements.backButton.onclick = () => navigate('colleges', state.selectedUniKey);
            elements.backButton.classList.remove('hidden');
        } else if (state.currentView === 'colleges') {
            elements.backButton.onclick = () => navigate('universities');
            elements.backButton.classList.remove('hidden');
        }
    } else {
        elements.controlsSection.classList.add('hidden');
    }

    if (state.currentView.startsWith('admin')) {
        elements.appContainer.classList.add('flex', 'flex-col');
        elements.content.classList.remove('grid');
        elements.content.classList.add('flex-col', 'flex', 'items-center', 'w-full', 'max-w-none', 'mx-0');
    } else {
        elements.appContainer.classList.remove('flex', 'flex-col');
        elements.content.classList.remove('flex-col', 'flex', 'items-center', 'w-full', 'max-w-none', 'mx-0');
        elements.content.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    }

    if (state.currentView === 'universities') {
        displayUniversities();
    } else if (state.currentView === 'colleges') {
        displayColleges(state.allData[state.selectedUniKey]);
    } else if (state.currentView === 'majors') {
        displayMajors(state.allData[state.selectedUniKey], state.selectedCollegeKey);
    }
    else if (state.currentView === 'plan') {
        displayPlan(state.allData[state.selectedUniKey], state.selectedMajorName);
    } else if (state.currentView === 'admin_login') {
        displayAdminLogin();
    } else if (state.currentView === 'admin_panel' && state.isAuthenticated) {
        displayAdminPanel();
    } else if (state.currentView === 'admin_edit_uni' && state.isAuthenticated) {
        displayEditUniversity(state.allData[state.selectedUniKey]);
    } else if (state.currentView === 'admin_panel' && !state.isAuthenticated) {
        navigate('admin_login');
    }
}
async function loadCollegesForUniversity(uniKey) {
    const collegesRef = collection(db, "universities", uniKey, "colleges");
    const querySnapshot = await getDocs(collegesRef);

    let collegesList = {};
    querySnapshot.forEach((doc) => {
        collegesList[doc.id] = doc.data();
    });

    if (state.allData[uniKey]) {
        state.allData[uniKey].colleges = collegesList;
    }

    render();
}
function displayUniversities() {
    const filteredUnis = Object.keys(state.allData).filter(key => {
        const uni = state.allData[key];
        const uniName = uni.name.toLowerCase();
        return uniName.includes(state.searchTerm);
    });

    if (filteredUnis.length === 0) {
        elements.content.innerHTML = `<p class="text-center col-span-full text-xl text-red-500 pt-8">لا توجد جامعات مطابقة للبحث.</p>`;
        return;
    }

    filteredUnis.forEach((key) => {
        const uni = state.allData[key];
        const uniCard = document.createElement("div");
        uniCard.className = "card uni-card bg-white p-6 rounded-xl card-shadow transition transform hover:scale-[1.02] cursor-pointer text-right";
        uniCard.style.borderTop = `6px solid ${uni.color || "#0a4b78"}`;

        const nameElement = document.createElement('h2');
        nameElement.textContent = uni.name;
        nameElement.className = 'text-xl font-bold mb-2';
        uniCard.appendChild(nameElement);
        uniCard.onclick = () => {
            state.selectedUniKey = key;
            state.currentView = 'colleges';
            render();
            loadCollegesForUniversity(key);
        };
        elements.content.appendChild(uniCard);
    });
}

function displayColleges(uni) {
    if (!uni) return navigate('universities');

    if (!uni.colleges) {
        elements.content.innerHTML = `<p class="text-center col-span-full text-lg text-gray-500">جارٍ تحميل الكليات...</p>`;
        elements.backButton.onclick = () => navigate('universities');
        elements.backButton.classList.remove('hidden');
        return;
    }

    const filteredColleges = Object.keys(uni.colleges).filter(key =>
        uni.colleges[key].name.toLowerCase().includes(state.searchTerm)
    );

    const uniColor = uni.color || '#0a4b78';

    const titleElement = document.createElement('h2');
    titleElement.textContent = `كليات ${uni.name}`;
    titleElement.className = "text-2xl font-bold text-center mb-6 col-span-full";
    titleElement.style.color = uniColor;
    elements.content.appendChild(titleElement);

    elements.content.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

    if (filteredColleges.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = `لا توجد كليات مطابقة للبحث.`;
        noResults.className = "text-center col-span-full text-xl text-red-500 pt-8";
        elements.content.appendChild(noResults);
        elements.backButton.onclick = () => navigate('universities');
        elements.backButton.classList.remove('hidden');
        return;
    }

    filteredColleges.forEach((collegeKey) => {
        const college = uni.colleges[collegeKey];
        const collegeCard = document.createElement("div");
        collegeCard.className = "card college-card bg-white p-6 rounded-xl card-shadow transition transform hover:scale-[1.02] cursor-pointer text-right";
        collegeCard.style.borderTop = `6px solid ${uniColor}`;

        const titleElement = document.createElement('h3');
        titleElement.textContent = college.name;
        titleElement.className = 'text-xl font-bold text-gray-800 mb-2';
        collegeCard.appendChild(titleElement);

        collegeCard.onclick = () => {
            state.selectedCollegeKey = collegeKey;
            state.currentView = 'majors';
            render();
            loadMajorsForCollege(state.selectedUniKey, collegeKey);
        };
        elements.content.appendChild(collegeCard);
    });

    elements.backButton.onclick = () => navigate('universities');
    elements.backButton.classList.remove('hidden');
}


function displayMajors(uni, collegeKey = null) {
    if (!uni) return navigate('universities');

    let majorsData = {};
    let headerText = '';

    if (collegeKey && uni.colleges && uni.colleges[collegeKey]) {
        const college = uni.colleges[collegeKey];
        if (!college || !college.majors) {
            elements.content.innerHTML = `<p>جارٍ تحميل التخصصات...</p>`;
            elements.backButton.onclick = () => navigate('colleges', state.selectedUniKey);
            elements.backButton.classList.remove('hidden');
            return;
        }
        majorsData = college.majors || {};
        headerText = `${college.name} - ${uni.name}`;
    } else if (uni.majors) {
        majorsData = uni.majors;
        headerText = uni.name;
    } else {
        return navigate('universities');
    }

    const filteredMajors = Object.keys(majorsData).filter(majorName =>
        majorName.toLowerCase().includes(state.searchTerm)
    );

    const uniColor = uni.color || '#0a4b78';

    const titleElement = document.createElement('h2');
    titleElement.textContent = headerText;
    titleElement.className = "text-2xl font-bold text-center mb-6 col-span-full";
    titleElement.style.color = uniColor;
    elements.content.appendChild(titleElement);

    elements.content.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

    if (filteredMajors.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = `لا توجد تخصصات مطابقة للبحث.`;
        noResults.className = "text-center col-span-full text-xl text-red-500 pt-8";
        elements.content.appendChild(noResults);
        elements.backButton.onclick = () => navigate('colleges', state.selectedUniKey);
        elements.backButton.classList.remove('hidden');
        return;
    }

    filteredMajors.forEach((majorName) => {
        const majorCard = document.createElement("div");
        majorCard.className = "card major-card bg-white p-5 rounded-xl card-shadow transition transform hover:scale-[1.02] cursor-pointer text-right border-r-4";
        majorCard.style.borderRightColor = uniColor;

        const titleElement = document.createElement('h3');
        titleElement.textContent = majorName;
        titleElement.className = 'text-lg font-bold text-gray-800';
        majorCard.appendChild(titleElement);

        const description = majorsData[majorName].description || 'اضغط لعرض الخطة الدراسية.';
        const descElement = document.createElement('p');
        descElement.textContent = description;
        descElement.className = 'text-sm text-gray-500 mt-1';
        majorCard.appendChild(descElement);

        majorCard.onclick = () => navigate('plan', state.selectedUniKey, collegeKey, majorName);
        elements.content.appendChild(majorCard);
    });

    elements.backButton.onclick = () => navigate('colleges', state.selectedUniKey);
    elements.backButton.classList.remove('hidden');
}
function displayPlan(uni, majorName) {
    let majorData = null;

    if (state.selectedCollegeKey && uni.colleges && uni.colleges[state.selectedCollegeKey]) {
        majorData = uni.colleges[state.selectedCollegeKey].majors[majorName];
    } else if (uni.majors) {
        majorData = uni.majors[majorName];
    }

    if (!majorData) return navigate('majors', state.selectedUniKey);

    const uniColor = uni.color || '#0a4b78';

    const backButtonPlan = document.createElement('button');
    backButtonPlan.textContent = '⬅ رجوع للتخصصات';
    backButtonPlan.className = 'bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 shadow-md self-start mb-6';
    backButtonPlan.onclick = () => navigate('majors', state.selectedUniKey, state.selectedCollegeKey);
    elements.content.appendChild(backButtonPlan);

    const titleElement = document.createElement('h2');
    titleElement.textContent = `${majorName} - ${uni.name}`;
    titleElement.className = 'text-2xl font-bold text-center mb-8 w-full';
    titleElement.style.color = uniColor;
    elements.content.appendChild(titleElement);

    elements.content.classList.remove("grid");
    elements.content.classList.add("flex-col", "items-center", "flex");

    if (majorData.plan_url && typeof majorData.plan_url === 'string') {
        const urlCard = document.createElement("div");
        urlCard.className = "card url-card bg-white p-6 rounded-xl card-shadow text-center w-full max-w-lg mb-6";
        urlCard.innerHTML = `
                    <h3 class="text-xl font-bold text-gray-800 mb-4">🔗 الخطة الدراسية الكاملة</h3>
                    <p class="text-gray-600 mb-4">سيتم فتح موقع الجامعة لعرض الخطة بالتفصيل.</p>
                    <a href="${majorData.plan_url}" target="_blank"
                       class="inline-block py-3 px-8 text-white font-bold rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
                       style="background: ${uniColor};">
                       الذهاب إلى الخطة
                    </a>
                `;
        elements.content.appendChild(urlCard);
    } else if (majorData.plan && Array.isArray(majorData.plan)) {
        majorData.plan.forEach(level => {
            const levelDiv = document.createElement("div");
            levelDiv.className = "card level-card bg-white p-6 rounded-xl card-shadow text-right w-full max-w-2xl mb-4";

            const levelTitle = document.createElement('h3');
            levelTitle.textContent = `المستوى ${level.level}`;
            levelTitle.className = 'text-xl font-bold mb-3 pb-2 border-b';
            levelTitle.style.borderBottomColor = uniColor;
            levelDiv.appendChild(levelTitle);

            const ul = document.createElement('ul');
            ul.className = 'list-none p-0';

            level.courses.forEach(c => {
                const li = document.createElement('li');
                li.textContent = c;
                li.className = 'py-2 border-b border-gray-100 text-gray-700';
                ul.appendChild(li);
            });

            levelDiv.appendChild(ul);
            elements.content.appendChild(levelDiv);
        });
    } else {
        const messageCard = document.createElement("div");
        messageCard.className = "card level-card bg-white p-6 rounded-xl card-shadow text-center w-full max-w-md";
        messageCard.innerHTML = `
                    <h3 class="text-xl font-bold text-red-600 mb-2">بيانات الخطة غير متوفرة</h3>
                    <p class="text-gray-600">يرجى مراجعة قاعدة البيانات وإضافة "plan" أو "plan_url".</p>
                `;
        elements.content.appendChild(messageCard);
    }
}

function displayAdminLogin() {
    elements.content.className = "flex justify-center items-start pt-10 w-full";
    elements.content.innerHTML = `
                <div class="bg-white p-8 rounded-xl card-shadow w-full max-w-md">
                    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">تسجيل دخول المدير</h2>
                    <form onsubmit="handleLogin(event)">
                        <div class="mb-4">
                            <label for="admin-email" class="block text-gray-700 font-semibold mb-2">البريد الإلكتروني:</label>
                            <input type="email" id="admin-email" required
                                   class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div class="mb-6">
                            <label for="admin-password" class="block text-gray-700 font-semibold mb-2">كلمة المرور:</label>
                            <input type="password" id="admin-password" required
                                   class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <button type="submit"
                                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition duration-150 shadow-md">
                            دخول
                        </button>
                    </form>
                    <button type="button" id="back-to-public-btn"
                            class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition duration-150 shadow-md mt-3">
                        رجوع إلى الصفحة الرئيسية
                    </button>
                    <p id="login-message" class="text-center mt-4 text-sm text-gray-500"></p>
                </div>
            `;
    document.getElementById('back-to-public-btn').onclick = () => navigate('universities');
}

function displayAdminPanel() {
    const welcomeMsg = document.createElement('h2');
    welcomeMsg.textContent = `مرحباً مدير النظام`;
    welcomeMsg.className = 'text-2xl font-bold text-center mb-6 text-indigo-700 w-full';
    elements.content.appendChild(welcomeMsg);

    const instruction = document.createElement('p');
    instruction.textContent = 'اضغط على الجامعة التي تريد تعديلها:';
    instruction.className = 'text-lg text-gray-700 mb-4 text-right w-full';
    elements.content.appendChild(instruction);

    const unisGrid = document.createElement('div');
    unisGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full';

    Object.keys(state.allData).forEach((key) => {
        const uni = state.allData[key];
        const uniCard = document.createElement("div");
        uniCard.className = "card uni-card bg-white p-6 rounded-xl card-shadow transition transform hover:bg-gray-50 cursor-pointer text-right border-2 border-transparent";
        uniCard.style.borderTop = `6px solid ${uni.color || "#0a4b78"}`;

        const nameElement = document.createElement('h2');
        nameElement.textContent = uni.name;
        nameElement.className = 'text-xl font-bold mb-2';
        uniCard.appendChild(nameElement);

        const editButton = document.createElement('button');
        editButton.textContent = 'تعديل الجامعة';
        editButton.className = 'mt-3 bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-lg text-sm';
        editButton.onclick = (e) => {
            e.stopPropagation();
            navigate('admin_edit_uni', key);
        };
        uniCard.appendChild(editButton);

        unisGrid.appendChild(uniCard);
    });

    const newUniButton = document.createElement("div");
    newUniButton.className = "card uni-card bg-white p-6 rounded-xl card-shadow flex flex-col justify-center items-center transition transform hover:scale-[1.02] cursor-pointer text-center border-2 border-dashed border-gray-300 hover:border-indigo-500";
    newUniButton.innerHTML = `<span class="text-4xl text-gray-500">+</span><p class="mt-2 text-indigo-600 font-semibold">إضافة جامعة جديدة</p>`;
    newUniButton.onclick = () => openAddUniModal();
    unisGrid.appendChild(newUniButton);

    elements.content.appendChild(unisGrid);
}

async function displayEditUniversity(uni) {
    if (!uni) return navigate('admin_panel');

    const uniKey = state.selectedUniKey;
    const editFormContainer = document.createElement('div');
    editFormContainer.className = 'bg-white p-4 sm:p-6 md:p-8 rounded-xl card-shadow w-full md:max-w-2xl lg:max-w-3xl mx-auto mb-6 md:mb-8';
    editFormContainer.innerHTML = `
       <h3 class="text-xl font-bold mb-4 text-center border-b pb-2">تعديل بيانات جامعة: ${uni.name}</h3>
        <form id="edit-uni-form" class="space-y-4">
             <div>
                 <label for="uni-name" class="block text-gray-700 font-semibold mb-1">اسم الجامعة:</label>
                 <input type="text" id="uni-name" value="${uni.name}" required
                        class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
             </div>
             <div>
                 <label for="uni-color" class="block text-gray-700 font-semibold mb-1">لون العلامة:</label>
                 <input type="color" id="uni-color" value="${uni.color || '#0a4b78'}" required
                        class="w-full h-10 p-1 border border-gray-300 rounded-lg">
             </div>
             <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition duration-150 shadow-md mt-4">
                 حفظ التعديلات الأساسية
             </button>
             <p id="save-message" class="text-center mt-3 text-sm"></p>
        </form>
    `;
    editFormContainer.querySelector('#edit-uni-form').onsubmit = (e) => handleSaveUniversity(e, uniKey, uni);
    elements.content.appendChild(editFormContainer);

    const collegesContainer = document.createElement('div');
    collegesContainer.className = 'bg-white p-4 sm:p-6 md:p-8 rounded-xl card-shadow w-full md:max-w-2xl lg:max-w-3xl mx-auto';
    collegesContainer.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2 gap-3">
            <h3 class="text-xl font-bold whitespace-nowrap">الكليات والتخصصات</h3>
            <button onclick="openAddCollegeModal()" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 text-xs sm:text-sm rounded-lg self-end sm:self-center shrink-0">
                + إضافة كلية
            </button>
        </div>
        <div id="colleges-list" class="space-y-4">
            <p class="text-center text-gray-500">جارٍ تحميل الكليات...</p>
        </div>
    `;
    elements.content.appendChild(collegesContainer);

    await loadAndDisplayColleges(uniKey);
}

async function loadAndDisplayColleges(uniKey) {
    try {
        const collegesRef = collection(db, "universities", uniKey, "colleges");
        const collegesSnapshot = await getDocs(collegesRef);

        let collegesList = {};
        collegesSnapshot.forEach((doc) => {
            collegesList[doc.id] = doc.data();
        });

        if (!state.allData[uniKey]) state.allData[uniKey] = {};
        state.allData[uniKey].colleges = collegesList;

        const collegesListDiv = document.getElementById('colleges-list');
        collegesListDiv.innerHTML = '';

        if (Object.keys(collegesList).length === 0) {
            collegesListDiv.innerHTML = '<p class="text-center text-gray-500">لا توجد كليات حالياً</p>';
            return;
        }

        for (const collegeKey of Object.keys(collegesList)) {
            const college = collegesList[collegeKey];
            const collegeDiv = document.createElement('div');
            collegeDiv.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow';
            collegeDiv.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 pb-3 border-b border-gray-200">
            <div class="flex-1">
                <h4 class="font-bold text-base sm:text-lg text-indigo-700 mb-1">${college.name}</h4>
                <p class="text-xs text-gray-500">الكلية: ${collegeKey}</p>
            </div>
            <div class="flex gap-2 shrink-0">
                <button data-college-key="${collegeKey}" class="edit-college-btn bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors duration-150 shadow-sm">
                    ✏️ تعديل
                </button>
                <button data-college-key="${collegeKey}" class="delete-college-btn bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors duration-150 shrink-0 shadow-sm">
                    🗑️ حذف
                </button>
            </div>
        </div>
        
        <div class="ml-0 sm:ml-4 space-y-3">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-gray-700">📚 التخصصات:</p>
                    <span id="major-count-${collegeKey}" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">0</span>
                </div>
                <button data-college-key="${collegeKey}" class="add-major-btn bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors duration-150 shrink-0 shadow-sm">
                    ➕ إضافة تخصص
                </button>
            </div>
            
            <div id="majors-list-${collegeKey}" class="majors-list space-y-2 min-h-[40px]">
                <div class="flex items-center justify-center py-3">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                    <p class="text-xs text-gray-400 mr-2">جارٍ تحميل التخصصات...</p>
                </div>
            </div>
        </div>
    `;

            collegesListDiv.appendChild(collegeDiv);

            const majorsContainer = document.getElementById(`majors-list-${collegeKey}`);
            await loadAndDisplayMajors(uniKey, collegeKey, majorsContainer, collegeKey);
        }

        // إضافة event listeners للأزرار
        document.querySelectorAll('.edit-college-btn').forEach(btn => {
            btn.onclick = () => openEditCollegeModal(btn.dataset.collegeKey);
        });
        document.querySelectorAll('.delete-college-btn').forEach(btn => {
            btn.onclick = () => deleteCollege(btn.dataset.collegeKey);
        });
        document.querySelectorAll('.add-major-btn').forEach(btn => {
            btn.onclick = () => openAddMajorModal(btn.dataset.collegeKey);
        });

    } catch (error) {
        console.error('خطأ في تحميل الكليات:', error);
        document.getElementById('colleges-list').innerHTML = '<p class="text-center text-red-500">خطأ في تحميل الكليات</p>';
    }
}

async function loadAndDisplayMajors(uniKey, collegeKey, majorsContainer, collegeKeyForCount) {
    try {
        const majorsRef = collection(db, "universities", uniKey, "colleges", collegeKey, "majors");
        const majorsSnapshot = await getDocs(majorsRef);

        let majorsList = {};
        majorsSnapshot.forEach((doc) => {
            majorsList[doc.id] = doc.data();
        });

        if (!state.allData[uniKey]) state.allData[uniKey] = {};
        if (!state.allData[uniKey].colleges) state.allData[uniKey].colleges = {};
        if (!state.allData[uniKey].colleges[collegeKey]) state.allData[uniKey].colleges[collegeKey] = { majors: {} };
        state.allData[uniKey].colleges[collegeKey].majors = majorsList;

        const countElement = document.getElementById(`major-count-${collegeKeyForCount}`);
        if (countElement) {
            countElement.textContent = Object.keys(majorsList).length;
        }

        majorsContainer.innerHTML = '';

        if (Object.keys(majorsList).length === 0) {
            majorsContainer.innerHTML = `
                <div class="bg-gray-100 border border-dashed border-gray-300 rounded-lg p-3 text-center">
                    <p class="text-xs text-gray-500">لا توجد تخصصات في هذه الكلية</p>
                    <p class="text-xs text-gray-400 mt-1">استخدم زر "إضافة تخصص" لإضافة تخصص جديد</p>
                </div>
            `;
            return;
        }

        Object.keys(majorsList).forEach((majorKey, index) => {
            const major = majorsList[majorKey];
            const majorDiv = document.createElement('div');
            majorDiv.className = 'bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow';
            majorDiv.innerHTML = `
                <div class="flex justify-between items-start gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold text-gray-400">${index + 1}.</span>
                            <p class="font-semibold text-sm text-gray-800">${major.name || majorKey}</p>
                        </div>
                        ${major.description ? `
                            <p class="text-xs text-gray-600 mt-1 line-clamp-2">${major.description}</p>
                        ` : ''}
                        ${major.plan_url ? `
                            <a href="${major.plan_url}" target="_blank" class="text-xs text-blue-600 hover:text-blue-700 underline mt-1 inline-block">
                                🔗 رابط الخطة الدراسية
                            </a>
                        ` : ''}
                    </div>
                    <div class="flex gap-1">
                        <button 
                            data-college-key="${collegeKey}" 
                            data-major-key="${majorKey}" 
                            class="edit-major-btn bg-blue-400 hover:bg-blue-500 text-white text-xs font-semibold py-1 px-2 rounded-lg transition-colors duration-150 shrink-0">
                            ✏️
                        </button>
                        <button 
                            data-college-key="${collegeKey}" 
                            data-major-key="${majorKey}" 
                            class="delete-major-btn bg-red-400 hover:bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded-lg transition-colors duration-150 shrink-0">
                            ✕
                        </button>
                    </div>
                </div>
            `;

            majorsContainer.appendChild(majorDiv);
        });

        // إضافة event listeners للأزرار
        majorsContainer.querySelectorAll('.edit-major-btn').forEach(btn => {
            btn.onclick = () => openEditMajorModal(btn.dataset.collegeKey, btn.dataset.majorKey);
        });
        majorsContainer.querySelectorAll('.delete-major-btn').forEach(btn => {
            btn.onclick = () => deleteMajor(btn.dataset.collegeKey, btn.dataset.majorKey);
        });

    } catch (error) {
        console.error('خطأ في تحميل التخصصات للكلية', collegeKey, error);
        majorsContainer.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                <p class="text-xs text-red-600">خطأ في تحميل التخصصات</p>
                <p class="text-xs text-red-400 mt-1">${error.message}</p>
            </div>
        `;
    }
}

window.openAddUniModal = function () {
    elements.addUniModal.classList.remove('hidden');
    document.getElementById('add-uni-form').reset();
    document.getElementById('add-uni-message').textContent = '';
};

window.closeAddUniModal = function () {
    elements.addUniModal.classList.add('hidden');
};

document.getElementById('add-uni-form').onsubmit = async function (e) {
    e.preventDefault();
    const messageElement = document.getElementById('add-uni-message');
    if (!state.isAuthenticated) {
        messageElement.textContent = '❌ غير مصرح لك. يجب تسجيل الدخول.';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }
    const key = document.getElementById('new-uni-key').value.trim().toLowerCase();
    const name = document.getElementById('new-uni-name').value.trim();
    const color = document.getElementById('new-uni-color').value;

    if (!key || !name || !color) {
        messageElement.textContent = '❌ يجب ملء جميع الحقول';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }

    const keyPattern = /^[a-z_]+$/;
    if (!keyPattern.test(key)) {
        messageElement.textContent = '❌ مفتاح الجامعة يجب أن يحتوي على حروف إنجليزية صغيرة فقط';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }

    try {
        const checkRef = doc(db, "universities", key);
        const checkSnap = await getDoc(checkRef);
        if (checkSnap.exists()) {
            messageElement.textContent = `❌ مفتاح الجامعة "${key}" موجود بالفعل!`;
            messageElement.className = 'text-red-500 font-bold';
            return;
        }
    } catch (error) {
        console.error("خطأ أثناء التحقق من وجود الجامعة:", error);
        messageElement.textContent = '❌ حدث خطأ أثناء التحقق. حاول مرة أخرى.';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }


    messageElement.textContent = '⏳ جارٍ الإضافة...';
    messageElement.className = 'text-blue-500';

    try {
        const newUniRef = doc(db, "universities", key);

        await setDoc(newUniRef, {
            name: name,
            color: color
        });

        messageElement.textContent = '✅ تمت الإضافة بنجاح!';
        messageElement.className = 'text-green-500 font-bold';

        await loadUniversities();

        setTimeout(() => {
            closeAddUniModal();
            navigate('admin_panel');
        }, 1000);

    } catch (error) {
        console.error('خطأ في إضافة الجامعة:', error);
        let errorMessage = '❌ فشلت الإضافة. ';
        if (error.code === 'permission-denied') { errorMessage += 'ليس لديك صلاحية للكتابة.'; }
        else if (error.code === 'unavailable') { errorMessage += 'مشكلة في الاتصال بالإنترنت.'; }
        else { errorMessage += 'حدث خطأ غير متوقع.'; }
        messageElement.textContent = errorMessage;
        messageElement.className = 'text-red-500 font-bold';
    }
};
elements.addUniModal.onclick = function (e) {
    if (e.target === elements.addUniModal) {
        closeAddUniModal();
    }
};

window.openAddMajorModal = function (collegeKey = null) {
    state.selectedCollegeKey = collegeKey;
    elements.addMajorModal.classList.remove('hidden');
    document.getElementById('add-major-form').reset();
    document.getElementById('add-major-message').textContent = '';
};
window.closeAddMajorModal = function () {
    elements.addMajorModal.classList.add('hidden');
};

document.getElementById('add-major-form').onsubmit = async function (e) {
    e.preventDefault();
    const messageElement = document.getElementById('add-major-message');

    if (!state.isAuthenticated) {
        messageElement.textContent = '❌ غير مصرح لك. يجب تسجيل الدخول.';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }
    const majorNameInput = document.getElementById('major-name');
    const majorKey = majorNameInput.value.trim().toLowerCase().replace(/\s+/g, '_');
    const majorDisplayName = majorNameInput.value.trim();
    const description = document.getElementById('major-description').value.trim();
    const planUrl = document.getElementById('major-plan-url').value.trim();
    const uniKey = state.selectedUniKey;
    const collegeKey = state.selectedCollegeKey;

    if (!collegeKey) {
        messageElement.textContent = '❌ خطأ: لم يتم تحديد الكلية.';
        messageElement.className = 'text-red-500';
        return;
    }
    if (!majorKey) {
        messageElement.textContent = '❌ يجب إدخال اسم التخصص.';
        messageElement.className = 'text-red-500';
        return;
    }

    messageElement.textContent = 'جارٍ الإضافة...';
    messageElement.className = 'text-blue-500';

    try {
        const newMajorData = {
            name: majorDisplayName
        };
        if (description) newMajorData.description = description;
        if (planUrl) newMajorData.plan_url = planUrl;

        const newMajorRef = doc(db, "universities", uniKey, "colleges", collegeKey, "majors", majorKey);

        await setDoc(newMajorRef, newMajorData);

        messageElement.textContent = '✅ تمت الإضافة بنجاح!';
        messageElement.className = 'text-green-500';

        await loadMajorsForCollege(uniKey, collegeKey);

        setTimeout(() => {
            closeAddMajorModal();
            render();
        }, 1000);

    } catch (error) {
        console.error("خطأ في إضافة التخصص:", error);
        messageElement.textContent = '❌ فشلت الإضافة: ' + (error.message || 'خطأ غير معروف');
        messageElement.className = 'text-red-500';
    }
};
elements.addMajorModal.onclick = function (e) {
    if (e.target === elements.addMajorModal) {
        closeAddMajorModal();
    }
};

window.deleteMajor = async function (collegeKey, majorKey) {
    if (!state.isAuthenticated) {
        alert('❌ غير مصرح لك. يجب تسجيل الدخول أولاً.');
        return;
    }
    const uniKey = state.selectedUniKey;
    const currentUni = state.allData[uniKey];

    if (!currentUni || !currentUni.colleges || !currentUni.colleges[collegeKey] || !currentUni.colleges[collegeKey].majors || !currentUni.colleges[collegeKey].majors[majorKey]) {
        alert('❌ خطأ: بيانات التخصص غير متاحة للحذف.');
        console.log("Missing data for deletion:", uniKey, collegeKey, majorKey, state.allData);
        return;
    }
    const major = currentUni.colleges[collegeKey].majors[majorKey];
    const majorDisplayName = major.name || majorKey;

    const confirmDelete = document.createElement('div');
    confirmDelete.className = 'fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 overflow-y-auto';
    confirmDelete.style.paddingTop = '2rem';
    confirmDelete.innerHTML = `
 <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm" onclick="event.stopPropagation()">
     <h3 class="text-xl font-bold mb-4 text-gray-800">⚠️ تأكيد الحذف</h3>
     <p class="mb-6 text-gray-600">هل أنت متأكد من حذف التخصص: <strong class="text-red-600">${majorDisplayName}</strong>؟</p>
     <p class="mb-6 text-sm text-gray-500">لا يمكن التراجع عن هذا الإجراء.</p>
     <div class="flex gap-2">
         <button id="confirm-yes" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition duration-150">
             نعم، احذف
         </button>
         <button id="confirm-no" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition duration-150">
             إلغاء
         </button>
     </div>
 </div>
`;

    document.body.appendChild(confirmDelete);

    document.getElementById('confirm-yes').onclick = async () => {
        try {
            const majorRef = doc(db, "universities", uniKey, "colleges", collegeKey, "majors", majorKey);

            await deleteDoc(majorRef);

            document.body.removeChild(confirmDelete);

            await loadMajorsForCollege(uniKey, collegeKey);

        } catch (error) {
            console.error("خطأ في حذف التخصص:", error);
            alert('فشل حذف التخصص: ' + error.message);
            document.body.removeChild(confirmDelete);
        }
    };

    document.getElementById('confirm-no').onclick = () => {
        document.body.removeChild(confirmDelete);
    };

    confirmDelete.onclick = (e) => {
        if (e.target === confirmDelete) {
            document.body.removeChild(confirmDelete);
        }
    };
};

// دوال تعديل التخصص - أضف هذه الدوال بعد window.deleteMajor
window.openEditMajorModal = function(collegeKey, majorKey) {
    const uniKey = state.selectedUniKey;
    const major = state.allData[uniKey]?.colleges?.[collegeKey]?.majors?.[majorKey];
    
    if (!major) {
        alert('❌ خطأ: بيانات التخصص غير متاحة.');
        return;
    }
    
    document.getElementById('edit-major-key').value = majorKey;
    document.getElementById('edit-major-college-key').value = collegeKey;
    document.getElementById('edit-major-name').value = major.name || '';
    document.getElementById('edit-major-description').value = major.description || '';
    document.getElementById('edit-major-plan-url').value = major.plan_url || '';
    document.getElementById('edit-major-modal').classList.remove('hidden');
    document.getElementById('edit-major-message').textContent = '';
};

window.closeEditMajorModal = function() {
    document.getElementById('edit-major-modal').classList.add('hidden');
};

document.getElementById('edit-major-form').onsubmit = async function(e) {
    e.preventDefault();
    const messageElement = document.getElementById('edit-major-message');
    
    if (!state.isAuthenticated) {
        messageElement.textContent = '❌ غير مصرح لك. يجب تسجيل الدخول.';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }
    
    const majorKey = document.getElementById('edit-major-key').value;
    const collegeKey = document.getElementById('edit-major-college-key').value;
    const newName = document.getElementById('edit-major-name').value.trim();
    const newDescription = document.getElementById('edit-major-description').value.trim();
    const newPlanUrl = document.getElementById('edit-major-plan-url').value.trim();
    const uniKey = state.selectedUniKey;
    
    if (!newName) {
        messageElement.textContent = '❌ يجب إدخال اسم التخصص';
        messageElement.className = 'text-red-500';
        return;
    }
    
    messageElement.textContent = '⏳ جارٍ الحفظ...';
    messageElement.className = 'text-blue-500';
    
    try {
        const majorRef = doc(db, "universities", uniKey, "colleges", collegeKey, "majors", majorKey);
        
        const updateData = {
            name: newName
        };
        
        if (newDescription) {
            updateData.description = newDescription;
        }
        
        if (newPlanUrl) {
            updateData.plan_url = newPlanUrl;
        }
        
        await updateDoc(majorRef, updateData);
        
        messageElement.textContent = '✅ تم التعديل بنجاح!';
        messageElement.className = 'text-green-500 font-bold';
        
        await loadMajorsForCollege(uniKey, collegeKey);
        
        setTimeout(() => {
            closeEditMajorModal();
        }, 1000);
        
    } catch (error) {
        console.error('خطأ في تعديل التخصص:', error);
        messageElement.textContent = '❌ فشل التعديل: ' + (error.message || 'حدث خطأ');
        messageElement.className = 'text-red-500 font-bold';
    }
};

document.getElementById('edit-major-modal').onclick = function(e) {
    if (e.target === document.getElementById('edit-major-modal')) {
        closeEditMajorModal();
    }
};


window.handleSaveUniversity = async function (event, uniKey, currentUniData) {
    event.preventDefault();

    if (!state.isAuthenticated) {
        document.getElementById('save-message').textContent = '❌ يجب أن تكون مسجلاً كمدير للحفظ.';
        document.getElementById('save-message').className = 'text-red-500';
        return;
    }

    const name = document.getElementById('uni-name').value;
    const color = document.getElementById('uni-color').value;
    const saveMessage = document.getElementById('save-message');

    saveMessage.textContent = 'جارٍ الحفظ...';
    saveMessage.className = 'text-blue-500';

    try {
        const uniRef = doc(db, "universities", uniKey);

        await updateDoc(uniRef, {
            name: name,
            color: color
        });

        saveMessage.textContent = '✅ تم حفظ التعديلات بنجاح!';
        saveMessage.className = 'text-green-500';

        await loadUniversities();

    } catch (error) {
        console.error("خطأ في حفظ الجامعة:", error);
        saveMessage.textContent = '❌ فشل الحفظ: ' + error.message;
        saveMessage.className = 'text-red-500';
    }
};
async function loadMajorsForCollege(uniKey, collegeKey) {
    const majorsRef = collection(db, "universities", uniKey, "colleges", collegeKey, "majors");
    const querySnapshot = await getDocs(majorsRef);

    let majorsList = {};
    querySnapshot.forEach((doc) => {
        majorsList[doc.id] = doc.data();
    });

    if (state.allData[uniKey] && state.allData[uniKey].colleges[collegeKey]) {
        state.allData[uniKey].colleges[collegeKey].majors = majorsList;
    }

    render();
}
async function loadUniversities() {
    try {

        const universitiesRef = collection(db, "universities");
        const querySnapshot = await getDocs(universitiesRef);

        if (querySnapshot.empty) {
            elements.content.innerHTML = "<p>لا توجد جامعات متاحة.</p>";
            return;
        }

        let uniList = {};
        querySnapshot.forEach((doc) => {
            uniList[doc.id] = doc.data();
        });

        state.allData = uniList;
        render();

    } catch (error) {
        console.error("خطأ في جلب قائمة الجامعات:", error);
        elements.content.innerHTML = "<p>حدث خطأ أثناء الاتصال بقاعدة البيانات.</p>";
    }
}
window.openAddCollegeModal = function () {
    elements.addCollegeModal = document.getElementById('add-college-modal');
    elements.addCollegeModal.classList.remove('hidden');
    document.getElementById('add-college-form').reset();
    document.getElementById('add-college-message').textContent = '';
};

window.closeAddCollegeModal = function () {
    document.getElementById('add-college-modal').classList.add('hidden');
};

document.getElementById('add-college-form').onsubmit = async function (e) {
    e.preventDefault();
    const messageElement = document.getElementById('add-college-message');
    if (!state.isAuthenticated) {
        messageElement.textContent = '❌ غير مصرح لك. يجب تسجيل الدخول.';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }
    const key = document.getElementById('new-college-key').value.trim().toLowerCase();
    const name = document.getElementById('new-college-name').value.trim();
    const uniKey = state.selectedUniKey;

    if (!key || !name) {
        messageElement.textContent = '❌ يجب ملء جميع الحقول';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }

    const keyPattern = /^[a-z_]+$/;
    if (!keyPattern.test(key)) {
        messageElement.textContent = '❌ مفتاح الكلية يجب أن يحتوي على حروف إنجليزية صغيرة فقط';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }

    messageElement.textContent = '⏳ جارٍ الإضافة...';
    messageElement.className = 'text-blue-500';

    try {
        const newCollegeRef = doc(db, "universities", uniKey, "colleges", key);

        await setDoc(newCollegeRef, {
            name: name
        });

        messageElement.textContent = '✅ تمت الإضافة بنجاح!';
        messageElement.className = 'text-green-500 font-bold';

        await loadCollegesForUniversity(uniKey);

        setTimeout(() => {
            closeAddCollegeModal();
        }, 1000);

    } catch (error) {
        console.error('خطأ في إضافة الكلية:', error);
        messageElement.textContent = '❌ فشلت الإضافة: ' + (error.message || 'حدث خطأ');
        messageElement.className = 'text-red-500 font-bold';
    }
};

document.getElementById('add-college-modal').onclick = function (e) {
    if (e.target === document.getElementById('add-college-modal')) {
        closeAddCollegeModal();
    }
};

window.deleteCollege = async function (collegeKey) {
    if (!state.isAuthenticated) {
        alert('❌ غير مصرح لك. يجب تسجيل الدخول أولاً.');
        return;
    }
    const uniKey = state.selectedUniKey;
    const currentUni = state.allData[uniKey];
    if (!currentUni || !currentUni.colleges || !currentUni.colleges[collegeKey]) {
        alert('❌ خطأ: بيانات الكلية غير متاحة للحذف.');
        return;
    }
    const college = currentUni.colleges[collegeKey];

    const confirmDelete = document.createElement('div');
confirmDelete.className = 'fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 overflow-y-auto';
confirmDelete.style.paddingTop = '2rem';
confirmDelete.innerHTML = `
 <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm" onclick="event.stopPropagation()">
     <h3 class="text-xl font-bold mb-4 text-gray-800">⚠️ تأكيد حذف الكلية</h3>
     <p class="mb-6 text-gray-600">هل أنت متأكد من حذف الكلية: <strong class="text-red-600">${college.name}</strong>؟</p>
     <p class="mb-6 text-sm text-red-500">ملاحظة: هذا لن يحذف التخصصات الموجودة داخلها تلقائياً.</p> 
     <div class="flex gap-2">
         <button id="confirm-yes" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition duration-150">
             نعم، احذف الكلية
         </button>
         <button id="confirm-no" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition duration-150">
             إلغاء
         </button>
     </div>
 </div>
`;


    document.body.appendChild(confirmDelete);

    document.getElementById('confirm-yes').onclick = async () => {
        try {
            const collegeRef = doc(db, "universities", uniKey, "colleges", collegeKey);

            await deleteDoc(collegeRef);

            document.body.removeChild(confirmDelete);

            await loadCollegesForUniversity(uniKey);

        } catch (error) {
            console.error("خطأ في حذف الكلية:", error);
            alert('فشل حذف الكلية: ' + error.message);
            document.body.removeChild(confirmDelete);
        }
    };

    document.getElementById('confirm-no').onclick = () => {
        document.body.removeChild(confirmDelete);
    };
};

// دوال تعديل الكلية - أضف هذه الدوال بعد window.deleteCollege
window.openEditCollegeModal = function(collegeKey) {
    const uniKey = state.selectedUniKey;
    const college = state.allData[uniKey]?.colleges?.[collegeKey];
    
    if (!college) {
        alert('❌ خطأ: بيانات الكلية غير متاحة.');
        return;
    }
    
    document.getElementById('edit-college-key').value = collegeKey;
    document.getElementById('edit-college-name').value = college.name;
    document.getElementById('edit-college-modal').classList.remove('hidden');
    document.getElementById('edit-college-message').textContent = '';
};

window.closeEditCollegeModal = function() {
    document.getElementById('edit-college-modal').classList.add('hidden');
};

document.getElementById('edit-college-form').onsubmit = async function(e) {
    e.preventDefault();
    const messageElement = document.getElementById('edit-college-message');
    
    if (!state.isAuthenticated) {
        messageElement.textContent = '❌ غير مصرح لك. يجب تسجيل الدخول.';
        messageElement.className = 'text-red-500 font-bold';
        return;
    }
    
    const collegeKey = document.getElementById('edit-college-key').value;
    const newName = document.getElementById('edit-college-name').value.trim();
    const uniKey = state.selectedUniKey;
    
    if (!newName) {
        messageElement.textContent = '❌ يجب إدخال اسم الكلية';
        messageElement.className = 'text-red-500';
        return;
    }
    
    messageElement.textContent = '⏳ جارٍ الحفظ...';
    messageElement.className = 'text-blue-500';
    
    try {
        const collegeRef = doc(db, "universities", uniKey, "colleges", collegeKey);
        
        await updateDoc(collegeRef, {
            name: newName
        });
        
        messageElement.textContent = '✅ تم التعديل بنجاح!';
        messageElement.className = 'text-green-500 font-bold';
        
        await loadCollegesForUniversity(uniKey);
        
        setTimeout(() => {
            closeEditCollegeModal();
        }, 1000);
        
    } catch (error) {
        console.error('خطأ في تعديل الكلية:', error);
        messageElement.textContent = '❌ فشل التعديل: ' + (error.message || 'حدث خطأ');
        messageElement.className = 'text-red-500 font-bold';
    }
};

document.getElementById('edit-college-modal').onclick = function(e) {
    if (e.target === document.getElementById('edit-college-modal')) {
        closeEditCollegeModal();
    }
};

window.onload = async () => {
    try {
        await enableIndexedDbPersistence(db);
        console.log("Persistence enabled.");
    } catch (error) {
        if (error.code == 'failed-precondition') {
            console.warn("Persistence failed, multiple tabs.");
        } else if (error.code == 'unimplemented') {
            console.warn("Persistence not supported.");
        }
    }

    await loadUniversities();
};
