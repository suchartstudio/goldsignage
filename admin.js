import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCypw3-0kmRKQCtMuVakq4dL-IfQ3UIAG4",
  authDomain: "goldshop-d5860.firebaseapp.com",
  projectId: "goldshop-d5860",
  storageBucket: "goldshop-d5860.firebasestorage.app",
  messagingSenderId: "15818908224",
  appId: "1:15818908224:web:17fc243d2aa671660075a5",
  measurementId: "G-9FP9640SQH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let loggedInUser = null; 

window.checkLogin = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (!user || !pass) return alert("กรุณาใส่รหัสผ่านและชื่อผู้ใช้");

    if (user === "admin" && pass === "987654321") {
        loggedInUser = { role: 'super', branchId: null };
        document.getElementById('login-section').style.display = "none";
        document.getElementById('admin-section').style.display = "block";
        document.getElementById('btn-create-branch').style.display = "inline-block";
        document.getElementById('super-admin-controls').style.display = "block";
        await loadBranches();
    } else {
        try {
            const q = query(collection(db, "branches"), where("username", "==", user), where("password", "==", pass));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const branchDoc = querySnapshot.docs[0];
                loggedInUser = { role: 'branch', branchId: branchDoc.id };
                
                document.getElementById('login-section').style.display = "none";
                document.getElementById('admin-section').style.display = "block";
                document.getElementById('btn-create-branch').style.display = "none";
                document.getElementById('super-admin-controls').style.display = "none";
                
                await loadBranches();
            } else {
                alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
            }
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการตรวจสอบบัญชี: " + error.message);
        }
    }
};

window.toggleMode = function() {
    const mode = document.getElementById('mode-select').value;
    document.getElementById('manual-inputs').style.display = (mode === 'manual') ? 'block' : 'none';
};

window.toggleOrnMode = function() {
    const mode = document.getElementById('orn-buy-mode').value;
    document.getElementById('orn-percent-setting').style.display = (mode === 'percentage') ? 'block' : 'none';
};

async function loadBranches() {
    const select = document.getElementById('branch-select');
    select.innerHTML = '';
    
    try {
        if (loggedInUser.role === 'super') {
            const querySnapshot = await getDocs(collection(db, "branches"));
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.text = data.branchName ? `${data.branchName} (ผู้ใช้: ${data.username})` : doc.id;
                select.appendChild(option);
            });
        } else {
            const docSnap = await getDoc(doc(db, "branches", loggedInUser.branchId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const option = document.createElement('option');
                option.value = docSnap.id;
                option.text = data.branchName || docSnap.id;
                select.appendChild(option);
            }
        }
        window.loadCurrentSettings();
    } catch (error) {
        console.error("Error loading branches:", error);
    }
}

window.createNewBranch = async function() {
    if (loggedInUser.role !== 'super') return;

    const branchName = prompt("📌 1/3: กรุณาตั้งชื่อสาขาใหม่:");
    if (!branchName) return;

    const username = prompt(`👤 2/3: กำหนด Username สำหรับสาขา "${branchName}":\n(ใช้สำหรับล็อกอิน)`);
    if (!username) return alert("การสร้างถูกยกเลิก: ต้องระบุ Username");

    const q = query(collection(db, "branches"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) return alert("❌ Username นี้มีผู้ใช้งานแล้ว กรุณาตั้งชื่ออื่น");

    const password = prompt(`🔑 3/3: กำหนด Password สำหรับสาขา "${branchName}":`);
    if (!password) return alert("การสร้างถูกยกเลิก: ต้องระบุ Password");

    const newBranchId = 'branch_' + Date.now();
    const initialData = {
        branchName: branchName,
        username: username,
        password: password,
        isAutoMode: true,
        logoUrl: "logo.png",
        showBar: true,
        showOrnament: true,
        showOrnBuy: true,
        showOrnSell: true,
        ornBuyMode: 'percentage',
        ornPercent: 5,
        showMarquee: true,
        bgColor: "#FF0000",
        textColor: "#FFFFFF",
        borderColor: "#FFFF00",
        marqueeColor: "#8B0000",
        marquee: "ยินดีต้อนรับสู่ " + branchName,
        createdAt: new Date()
    };

    try {
        await setDoc(doc(db, "branches", newBranchId), initialData);
        alert(`✅ สร้างสาขา "${branchName}" และบัญชี ${username} สำเร็จ!`);
        await loadBranches();
        document.getElementById('branch-select').value = newBranchId;
        window.loadCurrentSettings();
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
};

window.saveSettings = async function() {
    const branchId = document.getElementById('branch-select').value;
    const mode = document.getElementById('mode-select').value;
    const isAutoMode = (mode === 'auto');
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.innerText = "กำลังบันทึกข้อมูล...";
    saveBtn.disabled = true;

    try {
        const dataToSave = {
            branchName: document.getElementById('branch-name').value,
            logoUrl: document.getElementById('logo-url').value,
            bgColor: document.getElementById('color-bg').value,
            textColor: document.getElementById('color-text').value,
            borderColor: document.getElementById('color-border').value,
            marqueeColor: document.getElementById('color-marquee').value,
            showBar: document.getElementById('show-bar').checked,
            showOrnament: document.getElementById('show-ornament').checked,
            showOrnBuy: document.getElementById('show-orn-buy').checked,
            showOrnSell: document.getElementById('show-orn-sell').checked,
            showMarquee: document.getElementById('show-marquee').checked,
            ornBuyMode: document.getElementById('orn-buy-mode').value,
            ornPercent: parseFloat(document.getElementById('orn-percent-input').value) || 5,
            isAutoMode: isAutoMode,
            marquee: document.getElementById('marquee-input').value,
            updatedAt: new Date()
        };

        if (loggedInUser.role === 'super') {
            const newUsername = document.getElementById('branch-username').value.trim();
            const newPassword = document.getElementById('branch-password').value.trim();
            if (newUsername) dataToSave.username = newUsername;
            if (newPassword) dataToSave.password = newPassword;
        }

        if (!isAutoMode) {
            dataToSave.barBuy = document.getElementById('bar-buy-input').value;
            dataToSave.barSell = document.getElementById('bar-sell-input').value;
            dataToSave.ornamentBuy = document.getElementById('orn-buy-input').value;
            dataToSave.ornamentSell = document.getElementById('orn-sell-input').value;
        }

        await setDoc(doc(db, "branches", branchId), dataToSave, { merge: true });
        alert(`บันทึกข้อมูลสำเร็จ!`);
        
    } catch (error) {
        console.error("Error: ", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        saveBtn.innerText = "💾 บันทึกและอัปเดตหน้าจอ";
        saveBtn.disabled = false;
        
        if (loggedInUser.role === 'super') {
            const currentSelected = document.getElementById('branch-select').value;
            await loadBranches();
            document.getElementById('branch-select').value = currentSelected;
        }
    }
};

window.loadCurrentSettings = async function() {
    const branchId = document.getElementById('branch-select').value;
    const currentUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    document.getElementById('display-url').href = `${currentUrl}/index.html?branch=${branchId}`;

    const docSnap = await getDoc(doc(db, "branches", branchId));

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        document.getElementById('branch-name').value = data.branchName || "";
        document.getElementById('logo-url').value = data.logoUrl || "logo.png";
        
        if (loggedInUser.role === 'super') {
            document.getElementById('branch-username').value = data.username || "";
            document.getElementById('branch-password').value = data.password || "";
        }

        document.getElementById('color-bg').value = data.bgColor || "#FF0000";
        document.getElementById('color-text').value = data.textColor || "#FFFFFF";
        document.getElementById('color-border').value = data.borderColor || "#FFFF00";
        document.getElementById('color-marquee').value = data.marqueeColor || "#8B0000";

        document.getElementById('show-bar').checked = data.showBar !== false;
        document.getElementById('show-ornament').checked = data.showOrnament !== false;
        document.getElementById('show-orn-buy').checked = data.showOrnBuy !== false;
        document.getElementById('show-orn-sell').checked = data.showOrnSell !== false;
        document.getElementById('show-marquee').checked = data.showMarquee !== false;
        
        document.getElementById('orn-buy-mode').value = data.ornBuyMode || "percentage";
        document.getElementById('orn-percent-input').value = data.ornPercent !== undefined ? data.ornPercent : 5;
        window.toggleOrnMode();

        document.getElementById('mode-select').value = data.isAutoMode ? "auto" : "manual";
        window.toggleMode();
        
        document.getElementById('marquee-input').value = data.marquee || "";
        
        if (!data.isAutoMode) {
            document.getElementById('bar-buy-input').value = data.barBuy || "";
            document.getElementById('bar-sell-input').value = data.barSell || "";
            document.getElementById('orn-buy-input').value = data.ornamentBuy || "";
            document.getElementById('orn-sell-input').value = data.ornamentSell || "";
        }
    }
}

document.getElementById('branch-select').addEventListener('change', window.loadCurrentSettings);
