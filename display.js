import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const currentPlaylist = []; 

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

const urlParams = new URLSearchParams(window.location.search);
const branchId = urlParams.get('branch') || '1';

let lastRecordedPrice = null;

async function initLastRecordedPrice() {
    try {
        const q = query(collection(db, "price_history"), orderBy("timestamp", "desc"), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) lastRecordedPrice = snapshot.docs[0].data().buyPrice;
    } catch (e) {
        console.error("ไม่สามารถดึงประวัติราคาล่าสุดได้:", e);
    }
}
initLastRecordedPrice();

async function checkAndRecordPrice(currentBuyPrice) {
    if (!currentBuyPrice || isNaN(currentBuyPrice)) return;
    if (lastRecordedPrice === null || currentBuyPrice !== lastRecordedPrice) {
        try {
            await addDoc(collection(db, "price_history"), {
                buyPrice: currentBuyPrice,
                timestamp: new Date()
            });
            lastRecordedPrice = currentBuyPrice;
        } catch (error) {
            console.error("บันทึกประวัติราคาล้มเหลว:", error);
        }
    }
}

function formatToIntegerPrice(priceStr) {
    if (!priceStr) return "-";
    const cleanStr = priceStr.toString().replace(/,/g, '');
    const num = Math.round(parseFloat(cleanStr));
    return isNaN(num) ? "-" : num.toLocaleString('en-US');
}

async function fetchGoldPrice() {
    try {
        const proxyUrl = "https://us-central1-goldshop-d5860.cloudfunctions.net/goldProxy";
        
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error("Network response was not ok");
        const htmlString = await res.text(); 

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        const barBuyEl = doc.getElementById('DetailPlace_uc_goldprices1_lblBLBuy');
        const barSellEl = doc.getElementById('DetailPlace_uc_goldprices1_lblBLSell');
        const ornBuyEl = doc.getElementById('DetailPlace_uc_goldprices1_lblOMBuy'); 
        const ornSellEl = doc.getElementById('DetailPlace_uc_goldprices1_lblOMSell');
        const updateTimeEl = doc.getElementById('DetailPlace_uc_goldprices1_lblAsTime');

        if (!barBuyEl) throw new Error("ไม่สามารถอ่านข้อมูลจากเว็บสมาคมค้าทองคำได้");

        const rawBarBuy = parseFloat(barBuyEl.innerText.replace(/,/g, ''));
        const rawOrnBuy = ornBuyEl ? parseFloat(ornBuyEl.innerText.replace(/,/g, '')) : 0;

        return {
            rawBarBuy: rawBarBuy, 
            rawOrnBuy: rawOrnBuy,
            barBuy: formatToIntegerPrice(barBuyEl.innerText),
            barSell: formatToIntegerPrice(barSellEl.innerText),
            ornamentSell: formatToIntegerPrice(ornSellEl.innerText),
            updateTime: `อัพเดทล่าสุดตามสมาคมฯ: วันที่ ${new Date().toLocaleDateString('th-TH')} เวลา ${updateTimeEl.innerText.trim()}`
        };
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงราคา:", error);
        return null; 
    }
}

function updateDisplay(data) {
    if(data.barBuy !== undefined) document.getElementById('bar-buy').innerText = data.barBuy;
    if(data.barSell !== undefined) document.getElementById('bar-sell').innerText = data.barSell;
    if(data.ornamentSell !== undefined) {
        const ornSellEl = document.getElementById('ornament-sell');
        if (ornSellEl) ornSellEl.innerText = data.ornamentSell;
    }
    
    let finalOrnBuy = "-";
    if (data.ornBuyMode === 'base_tax') {
        document.getElementById('ornament-buy-label').innerText = "ฐานภาษี";
        finalOrnBuy = data.rawOrnBuy ? formatToIntegerPrice(data.rawOrnBuy) : (data.ornamentBuy || "-");
    } else {
        document.getElementById('ornament-buy-label').innerText = "รับซื้อ";
        const percent = parseFloat(data.ornPercent) || 5;
        const basePrice = data.rawBarBuy || parseFloat((data.barBuy || "0").toString().replace(/,/g, ''));
        if (basePrice > 0) {
            finalOrnBuy = Math.round(basePrice - (basePrice * (percent / 100))).toLocaleString('en-US');
        } else {
            finalOrnBuy = data.ornamentBuy || "-";
        }
    }
    document.getElementById('ornament-buy').innerText = finalOrnBuy;
    
    if (data.marquee !== undefined) document.getElementById('marquee-text').innerText = data.marquee;
    if (data.updateTime !== undefined) document.getElementById('update-time').innerText = data.updateTime;

    const logoEl = document.getElementById('shop-logo');
    if (data.logoUrl) {
        logoEl.src = data.logoUrl;
        logoEl.style.display = 'block';
    }

    if (data.bgColor) document.documentElement.style.setProperty('--bg-color', data.bgColor);
    if (data.textColor) document.documentElement.style.setProperty('--text-color', data.textColor);
    if (data.borderColor) document.documentElement.style.setProperty('--border-color', data.borderColor);
    if (data.marqueeColor) document.documentElement.style.setProperty('--marquee-bg', data.marqueeColor);

    document.getElementById('section-bar').style.display = data.showBar !== false ? 'flex' : 'none';
    document.getElementById('section-ornament').style.display = data.showOrnament !== false ? 'flex' : 'none';
    document.getElementById('section-marquee').style.display = data.showMarquee !== false ? 'flex' : 'none';

    document.getElementById('ornament-buy-container').style.display = data.showOrnBuy !== false ? 'flex' : 'none';
    document.getElementById('ornament-sell-container').style.display = data.showOrnSell !== false ? 'flex' : 'none';

    const ornContainer = document.getElementById('ornament-container');
    if (data.showOrnBuy === false || data.showOrnSell === false) {
        ornContainer.classList.add('single-price');
    } else {
        ornContainer.classList.remove('single-price');
    }
}

let autoFetchInterval = null;

onSnapshot(doc(db, "branches", branchId), async (docSnap) => {
    if (docSnap.exists()) {
        const config = docSnap.data();
        if (autoFetchInterval) clearInterval(autoFetchInterval);

        if (config.isAutoMode) {
            const goldPrice = await fetchGoldPrice();
            if (goldPrice && goldPrice.barBuy !== "-") {
                updateDisplay({ ...config, ...goldPrice }); 
                checkAndRecordPrice(goldPrice.rawBarBuy); 
            } else {
                updateDisplay(config); 
            }

            autoFetchInterval = setInterval(async () => {
                const freshPrice = await fetchGoldPrice();
                if (freshPrice && freshPrice.barBuy !== "-") {
                    updateDisplay({ ...config, ...freshPrice });
                    checkAndRecordPrice(freshPrice.rawBarBuy);
                }
            }, 60000);

        } else {
            const manualConfig = { ...config };
            
            if (manualConfig.barBuy) {
                const rawManualPrice = parseFloat(manualConfig.barBuy.toString().replace(/,/g, ''));
                checkAndRecordPrice(rawManualPrice);
                manualConfig.barBuy = formatToIntegerPrice(manualConfig.barBuy);
            }
            
            if (manualConfig.barSell) manualConfig.barSell = formatToIntegerPrice(manualConfig.barSell);
            if (manualConfig.ornamentSell) manualConfig.ornamentSell = formatToIntegerPrice(manualConfig.ornamentSell);
            
            if (config.updatedAt) {
                const d = config.updatedAt.toDate();
                const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
                const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                manualConfig.updateTime = `อัพเดทราคาล่าสุด (กำหนดเอง): วันที่ ${dateStr} เวลา ${timeStr}`;
            } else {
                manualConfig.updateTime = `อัพเดทราคาล่าสุด (กำหนดเอง): -`;
            }

            updateDisplay(manualConfig);
        }
    }
});
