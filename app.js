/**
 * Nicecenter Oil - Leave Recording App
 * Core Application Logic (State Management, DOM Rendering, Validation, and Storage)
 * Enhanced: Cloud Mode (Google Sheets integration via Apps Script) & Dynamic Employee Registry
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 1. Initial Data and Fallback Configuration
    // ==========================================================================
    
    // Paste your Google Apps Script Web App URL here to connect to the cloud
    const API_URL = "https://script.google.com/macros/s/AKfycbwF0UB_WAQEg9i8PI_6xYgEGVGOI5sy0a5fvLRLfNBsRmaaG_OCIOG3pkHdjDxeYcLmvA/exec"; 

    // Static fallback lists to be used if Cloud API is not connected yet
    const STATIC_EMPLOYEES = [
        { id: 'nice001', name: 'คุณนนท์', englishName: 'Nont', pin: '1234', role: 'Manager', color: '#10b981', initial: 'N', annualQuota: '15', sickQuota: '30', personalQuota: '10' },
        { id: 'nice002', name: 'คุณออย', englishName: 'Oil', pin: '1234', role: 'Assistant Manager', color: '#f59e0b', initial: 'O', annualQuota: '15', sickQuota: '30', personalQuota: '10' },
        { id: 'nice003', name: 'คุณเบนซ์', englishName: 'Benz', pin: '1234', role: 'Operations Specialist', color: '#8b5cf6', initial: 'B', annualQuota: '15', sickQuota: '30', personalQuota: '10' },
        { id: 'nice004', name: 'คุณเดียร์', englishName: 'Dear', pin: '1234', role: 'Logistics Coordinator', color: '#3b82f6', initial: 'D', annualQuota: '15', sickQuota: '30', personalQuota: '10' },
        { id: 'nice005', name: 'คุณทราย', englishName: 'Sine', pin: '1234', role: 'Customer Service', color: '#ec4899', initial: 'S', annualQuota: '15', sickQuota: '30', personalQuota: '10' },
        { id: 'nice006', name: 'คุณเป้', englishName: 'Pae', pin: '1234', role: 'Technical Support', color: '#14b8a6', initial: 'P', annualQuota: '15', sickQuota: '30', personalQuota: '10' }
    ];

    const INITIAL_LEAVES = [
        {
            id: 'sample-1',
            employeeId: 'nice002',
            type: 'annual',
            startDate: '2026-05-25',
            endDate: '2026-05-26',
            halfDay: null,
            reason: 'พักผ่อนประจำปีที่ทะเลกับครอบครัว',
            days: 2,
            status: 'approved'
        },
        {
            id: 'sample-2',
            employeeId: 'nice003',
            type: 'sick',
            startDate: '2026-05-27',
            endDate: '2026-05-27',
            halfDay: 'morning',
            reason: 'เป็นไข้หวัดสูง ปวดศีรษะขอลากิจครึ่งวันเช้าเพื่อไปพบแพทย์',
            days: 0.5,
            status: 'approved'
        },
        {
            id: 'sample-3',
            employeeId: 'nice005',
            type: 'personal',
            startDate: '2026-05-29',
            endDate: '2026-05-29',
            halfDay: 'afternoon',
            reason: 'ไปติดต่อธุระราชการเรื่องโอนที่ดินที่ต่างจังหวัด',
            days: 0.5,
            status: 'approved'
        }
    ];

    // Core App State
    let state = {
        currentUser: null,
        selectedEmployeeForLogin: null,
        pinBuffer: '',
        currentDate: new Date('2026-05-25T10:00:00+07:00'),
        calendarWeekStart: null,
        employees: [...STATIC_EMPLOYEES], // Populated dynamically from API or static list
        leaves: [],
        holidays: [], // Company holidays loaded dynamically
        theme: 'dark',
        isCloudConnected: false
    };

    // ==========================================================================
    // 2. Storage & Cloud API Service Engine (Hybrid Database)
    // ==========================================================================
    
    async function loadAllData() {
        // Attempt cloud loading first
        const isApiValid = API_URL && API_URL !== "" && !API_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP");
        
        if (isApiValid) {
            try {
                const response = await fetch(API_URL, { redirect: "follow" });
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.employees && data.employees.length > 0) {
                        const PREMIUM_COLORS = [
                            '#10b981', // emerald
                            '#f59e0b', // amber
                            '#8b5cf6', // purple
                            '#3b82f6', // blue
                            '#ec4899', // pink
                            '#14b8a6', // teal
                            '#f43f5e', // rose
                            '#06b6d4', // cyan
                            '#84cc16', // lime
                            '#a855f7', // purple-light
                            '#f97316'  // orange
                        ];
                        
                        data.employees.forEach((emp, index) => {
                            // 1. Assign dynamic premium colors if empty
                            if (!emp.color || emp.color.trim() === "" || emp.color === "undefined") {
                                emp.color = PREMIUM_COLORS[index % PREMIUM_COLORS.length];
                            }
                            
                            // 2. Assign clean 1-2 letter initials
                            if (!emp.initial || emp.initial.trim() === "" || emp.initial === "undefined") {
                                let cleanName = emp.name ? emp.name.replace(/คุณ/g, '').trim() : '';
                                emp.initial = cleanName ? cleanName.charAt(0) : 'E';
                            } else if (emp.initial.length > 2) {
                                // If initial is like "Nas", "Piy", truncate to 2 letters to avoid visual overflow
                                emp.initial = emp.initial.substring(0, 2);
                            }
                        });
                        
                        state.employees = data.employees;
                    }
                    state.leaves = (data.leaves || []).map(l => ({
                        ...l,
                        startDate: normalizeDateToYYYYMMDD(l.startDate),
                        endDate: normalizeDateToYYYYMMDD(l.endDate)
                    }));
                    state.holidays = (data.holidays || []).map(h => ({
                        ...h,
                        date: normalizeDateToYYYYMMDD(h.date)
                    }));
                    state.isCloudConnected = true;
                    console.log("Nice HR: Cloud connected successfully. Data retrieved from Google Sheets.");
                    return;
                }
            } catch (err) {
                console.warn("Nice HR: Cloud connection failed. Falling back to LocalStorage.", err);
            }
        }

        // Fallback Local Storage Mode
        state.isCloudConnected = false;
        
        // Load leaves
        if (!localStorage.getItem('nice_leaves')) {
            localStorage.setItem('nice_leaves', JSON.stringify(INITIAL_LEAVES));
            state.leaves = [...INITIAL_LEAVES];
        } else {
            state.leaves = JSON.parse(localStorage.getItem('nice_leaves')).map(l => ({
                ...l,
                startDate: normalizeDateToYYYYMMDD(l.startDate),
                endDate: normalizeDateToYYYYMMDD(l.endDate)
            }));
        }

        // Static fallback holidays for preview/offline mode (e.g. Visakha Bucha falls on May 28, 2026!)
        state.holidays = [
            { date: '2026-05-28', name: 'วันวิสาขบูชา' }
        ];

        // Apply fallback standard employees registry
        state.employees = [...STATIC_EMPLOYEES];
    }

    async function saveNewLeave(leaveObj) {
        if (state.isCloudConnected) {
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    redirect: "follow",
                    body: JSON.stringify({
                        action: "addLeave",
                        ...leaveObj
                    })
                });
                if (response.ok) {
                    state.leaves.push(leaveObj);
                    return true;
                }
            } catch (err) {
                showToast("เครือข่ายขัดข้อง", "ไม่สามารถเชื่อมต่อคลาวด์ได้ บันทึกถูกข้าม", "error");
                return false;
            }
        }

        // Local Storage mode
        state.leaves.push(leaveObj);
        localStorage.setItem('nice_leaves', JSON.stringify(state.leaves));
        return true;
    }

    async function updateLeaveStatusOnServer(leaveId, newStatus) {
        if (state.isCloudConnected) {
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    redirect: "follow",
                    body: JSON.stringify({
                        action: "updateLeaveStatus",
                        id: leaveId,
                        status: newStatus
                    })
                });
                if (response.ok) {
                    state.leaves = state.leaves.map(l => l.id === leaveId ? { ...l, status: newStatus } : l);
                    return true;
                }
            } catch (err) {
                showToast("เครือข่ายขัดข้อง", "ไม่สามารถปรับปรุงสถานะบนคลาวด์ได้", "error");
                return false;
            }
        }

        // Local Storage mode
        state.leaves = state.leaves.map(l => l.id === leaveId ? { ...l, status: newStatus } : l);
        localStorage.setItem('nice_leaves', JSON.stringify(state.leaves));
        return true;
    }

    function initLocalStorage() {
        // Initialize Theme
        if (localStorage.getItem('nice_theme')) {
            state.theme = localStorage.getItem('nice_theme');
        } else {
            state.theme = 'dark';
        }
        
        // Load logged in user if session persists
        const sessionUser = sessionStorage.getItem('nice_logged_in_user');
        if (sessionUser) {
            // Find logged-in user in active employee array
            const foundUser = state.employees.find(e => e.id === sessionUser);
            if (foundUser) {
                state.currentUser = foundUser;
            }
        }
    }

    // ==========================================================================
    // 3. Date & Calculation Utility Functions
    // ==========================================================================

    function normalizeDateToYYYYMMDD(dateVal) {
        if (!dateVal) return "";
        
        // If it's already a clean YYYY-MM-DD string
        const strVal = dateVal.toString().trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
            return strVal;
        }
        
        try {
            const d = new Date(strVal);
            if (isNaN(d.getTime())) {
                const match = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                if (match) {
                    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                }
                return strVal;
            }
            
            // Shift by Bangkok Time (UTC+7) to handle UTC conversion shifts by Google Sheets Apps Script.
            // A Date represented as 00:00 Bangkok is parsed as 17:00 of the previous day UTC.
            // Adding 7 hours shifts the time component to 00:00 UTC of the correct day.
            const bangkokShiftedTime = d.getTime() + (7 * 60 * 60 * 1000);
            const shiftedDate = new Date(bangkokShiftedTime);
            
            const year = shiftedDate.getUTCFullYear();
            const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0');
            const date = String(shiftedDate.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${date}`;
        } catch (e) {
            return strVal;
        }
    }

    // Get Monday of any given date
    function getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    // Format date in Thai format
    const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    function formatThaiShort(dateObj) {
        const d = new Date(dateObj);
        return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;
    }

    function formatThaiFull(dateObj) {
        const d = new Date(dateObj);
        return `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;
    }

    // Format Date string as YYYY-MM-DD
    function formatDateString(dateObj) {
        const d = new Date(dateObj);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    // Helper to check if a date is a registered company holiday
    function isHoliday(dateStr) {
        if (!state.holidays || state.holidays.length === 0) return false;
        return state.holidays.some(h => h.date === dateStr);
    }

    // Calculate leave days between start and end (excluding Sunday and Company Holidays)
    function calculateWorkingDays(startDateStr, endDateStr, isHalfDay) {
        if (isHalfDay) return 0.5;
        if (!startDateStr || !endDateStr) return 0;
        
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        
        if (start > end) return 0;
        
        let count = 0;
        let cur = new Date(start);
        
        while (cur <= end) {
            const dayOfWeek = cur.getDay();
            const curStr = formatDateString(cur);
            
            // Exclude Sunday (0) AND any company holidays!
            if (dayOfWeek !== 0 && !isHoliday(curStr)) {
                count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
        
        return count;
    }

    // Dynamic quota reader parsing multiple column structures (e.g. Annual Leave or annualQuota)
    function getEmployeeQuotaLimit(emp, leaveType) {
        if (!emp) return leaveType === 'sick' ? 30 : (leaveType === 'personal' ? 10 : 15);
        
        let limit = 0;
        if (leaveType === 'annual') {
            limit = emp.annualQuota || emp["Annual Leave"] || emp["annual_leave"] || emp.annual || 15;
        } else if (leaveType === 'sick') {
            limit = emp.sickQuota || emp["Sick Leave"] || emp["sick_leave"] || emp.sick || 30;
        } else if (leaveType === 'personal') {
            limit = emp.personalQuota || emp["Personal Leave"] || emp["personal_leave"] || emp.personal || 10;
        }
        return parseFloat(limit) || 0;
    }

    // Calculate individual employee leave quota usage
    function getLeaveQuotaStatus(employeeId) {
        const userLeaves = state.leaves.filter(l => l.employeeId === employeeId && (l.status === 'approved' || l.status === 'pending_cancel'));
        const empObj = state.employees.find(e => e.id === employeeId);

        const used = { sick: 0, personal: 0, annual: 0 };
        userLeaves.forEach(l => {
            if (used[l.type] !== undefined) {
                used[l.type] += l.days;
            }
        });

        const limits = {
            sick: getEmployeeQuotaLimit(empObj, 'sick'),
            personal: getEmployeeQuotaLimit(empObj, 'personal'),
            annual: getEmployeeQuotaLimit(empObj, 'annual')
        };

        return {
            sick: { used: used.sick, total: limits.sick, rem: limits.sick - used.sick },
            personal: { used: used.personal, total: limits.personal, rem: limits.personal - used.personal },
            annual: { used: used.annual, total: limits.annual, rem: limits.annual - used.annual }
        };
    }

    // ==========================================================================
    // 4. UI Transition / View Switcher
    // ==========================================================================
    
    const views = {
        calendar: document.getElementById('view-public-calendar'),
        login: document.getElementById('view-login'),
        portal: document.getElementById('view-employee-portal')
    };

    function switchView(targetViewKey) {
        // Hide all views with animation
        Object.keys(views).forEach(key => {
            if (key === targetViewKey) {
                views[key].classList.add('active');
            } else {
                views[key].classList.remove('active');
            }
        });

        // Toggle user status header elements
        const headerStatus = document.getElementById('header-user-status');
        const loginBtn = document.getElementById('btn-goto-login');
        
        // Navigation Tabs elements
        const appNav = document.getElementById('app-nav');
        const navBtnCalendar = document.getElementById('nav-btn-calendar');
        const navBtnPortal = document.getElementById('nav-btn-portal');

        if (state.currentUser) {
            headerStatus.classList.remove('hidden');
            loginBtn.classList.add('hidden');
            
            // Populate Header Details
            document.getElementById('header-user-avatar').innerText = state.currentUser.initial || state.currentUser.name.charAt(0);
            document.getElementById('header-user-avatar').style.backgroundColor = state.currentUser.color || '#10b981';
            document.getElementById('header-user-name').innerText = state.currentUser.name;
            document.getElementById('header-user-role').innerText = state.currentUser.role;

            // Show app navigation tabs when logged in (only on calendar or portal view)
            if (targetViewKey === 'calendar' || targetViewKey === 'portal') {
                appNav.classList.remove('hidden');
                
                // Toggle active tab state
                if (targetViewKey === 'calendar') {
                    navBtnCalendar.classList.add('active');
                    navBtnPortal.classList.remove('active');
                } else if (targetViewKey === 'portal') {
                    navBtnPortal.classList.add('active');
                    navBtnCalendar.classList.remove('active');
                }
            } else {
                appNav.classList.add('hidden');
            }
        } else {
            headerStatus.classList.add('hidden');
            loginBtn.classList.remove('hidden');
            appNav.classList.add('hidden');
        }

        // Trigger relevant view renderers
        if (targetViewKey === 'calendar') {
            renderWeeklyCalendar();
            renderStatsDashboard();
        } else if (targetViewKey === 'login') {
            renderLoginSelection();
            resetPinPad();
        } else if (targetViewKey === 'portal') {
            renderEmployeeDashboard();
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==========================================================================
    // 5. Toast Notification System
    // ==========================================================================
    
    function showToast(title, message, type = 'success') {
        const toast = document.getElementById('toast-notification');
        const toastIcon = document.getElementById('toast-icon');
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');

        toastTitle.innerText = title;
        toastMessage.innerText = message;

        if (type === 'success') {
            toast.classList.remove('error');
            toastIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        } else {
            toast.classList.add('error');
            toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        }

        toast.classList.add('active');

        // Automatically close after 3.5 seconds
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3500);
    }

    // ==========================================================================
    // 6. View Rendering Functions
    // ==========================================================================

    /* ----------------------------------------------------
       6A. PUBLIC WEEKLY CALENDAR & STATS
       ---------------------------------------------------- */

    function renderStatsDashboard() {
        // Staff count
        document.getElementById('stats-total-staff').innerText = `${state.employees.length} คน`;

        // Active today status
        const todayStr = formatDateString(state.currentDate);
        let staffOnLeaveToday = 0;
        
        state.employees.forEach(emp => {
            const hasLeave = state.leaves.some(l => 
                l.employeeId === emp.id && 
                (l.status === 'approved' || l.status === 'pending_cancel') &&
                todayStr >= l.startDate && 
                todayStr <= l.endDate
            );
            if (hasLeave) staffOnLeaveToday++;
        });

        const activeToday = state.employees.length - staffOnLeaveToday;
        document.getElementById('stats-active-today').innerText = `${activeToday} / ${state.employees.length} คน`;

        // Total leaves in this viewed week
        const weekMon = new Date(state.calendarWeekStart);
        const weekSun = new Date(state.calendarWeekStart);
        weekSun.setDate(weekSun.getDate() + 6);

        const monStr = formatDateString(weekMon);
        const sunStr = formatDateString(weekSun);

        const leavesThisWeek = state.leaves.filter(l => 
            (l.status === 'approved' || l.status === 'pending_cancel') &&
            ((l.startDate >= monStr && l.startDate <= sunStr) || 
             (l.endDate >= monStr && l.endDate <= sunStr) ||
             (l.startDate <= monStr && l.endDate >= sunStr))
        );

        // Sum up leaves days inside this week
        let totalWeekLeaveDays = 0;
        leavesThisWeek.forEach(l => {
            let cur = new Date(l.startDate);
            let end = new Date(l.endDate);
            
            while(cur <= end) {
                const curStr = formatDateString(cur);
                if (curStr >= monStr && curStr <= sunStr) {
                    const dayOfWeek = cur.getDay();
                    if (dayOfWeek !== 0 && !isHoliday(curStr)) { // Exclude Sunday and registered holidays
                        totalWeekLeaveDays += (l.halfDay ? 0.5 : 1);
                    }
                }
                cur.setDate(cur.getDate() + 1);
            }
        });

        document.getElementById('stats-leaves-this-week').innerText = `${totalWeekLeaveDays} วัน`;
    }

    function renderWeeklyCalendar() {
        const monday = state.calendarWeekStart;
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        // Render Calendar Title Header Dates
        document.getElementById('calendar-week-range').innerText = `วันที่ ${formatThaiShort(monday)} - ${formatThaiShort(sunday)} (ปี พ.ศ. ${monday.getFullYear() + 543})`;

        // Update table header days
        const headerDays = document.querySelectorAll('.calendar-table thead th.col-day');
        headerDays.forEach((th, idx) => {
            const colDate = new Date(monday);
            colDate.setDate(colDate.getDate() + idx);
            const dateLabel = th.querySelector('.date-label');
            dateLabel.innerText = formatThaiShort(colDate);
            th.setAttribute('data-date', formatDateString(colDate));
        });

        // Populate Table Body
        const tbody = document.getElementById('calendar-tbody');
        tbody.innerHTML = '';

        const tr = document.createElement('tr');

        // Columns Mon - Sun (0 to 6)
        for (let idx = 0; idx < 7; idx++) {
            const tdDay = document.createElement('td');
            tdDay.setAttribute('data-day-idx', idx);
            
            const colDate = new Date(monday);
            colDate.setDate(colDate.getDate() + idx);
            const colDateStr = formatDateString(colDate);

            // Highlight today's column visually
            const todayStr = formatDateString(state.currentDate);
            if (colDateStr === todayStr) {
                tdDay.classList.add('col-highlight');
            }

            let cellContent = '';

            // 0. Mobile-only Date Header
            const dayNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
            const dayName = dayNames[idx];
            const dateLabel = formatThaiShort(colDate);
            cellContent += `
                <div class="calendar-mobile-date-header">
                    <span class="day-name">วัน${dayName}</span>
                    <span class="date-label">${dateLabel}</span>
                </div>
            `;

            // 1. Holiday Check
            if (isHoliday(colDateStr)) {
                const holObj = state.holidays.find(h => h.date === colDateStr);
                const holName = holObj ? holObj.name : 'วันหยุดประจำปี';
                cellContent += `
                    <div class="calendar-holiday-block" title="${holName}">
                        <i class="fa-solid fa-star holiday-star"></i>
                        <span>${holName}</span>
                    </div>
                `;
            }

            // 2. Sunday Check
            const dayOfWeek = colDate.getDay();
            if (dayOfWeek === 0) {
                cellContent += `
                    <div class="calendar-sunday-block">
                        <span>วันหยุดประจำสัปดาห์</span>
                    </div>
                `;
            }

            // 3. Leaves Check (Collect all employee leaves on this day)
            const activeLeaves = state.leaves.filter(l => 
                (l.status === 'approved' || l.status === 'pending_cancel') &&
                colDateStr >= l.startDate && 
                colDateStr <= l.endDate
            );

            if (activeLeaves.length > 0) {
                activeLeaves.forEach(activeLeave => {
                    const emp = state.employees.find(e => e.id === activeLeave.employeeId);
                    if (!emp) return;

                    const isHalfDay = activeLeave.halfDay !== null;
                    const halfText = activeLeave.halfDay === 'morning' ? ' (เช้า)' : (activeLeave.halfDay === 'afternoon' ? ' (บ่าย)' : '');
                    const pendingCancelText = activeLeave.status === 'pending_cancel' ? ' (รออนุมัติยกเลิก)' : '';
                    
                    let badgeClass = '';
                    let leaveTypeName = '';
                    
                    if (activeLeave.type === 'sick') {
                        badgeClass = 'badge-sick';
                        leaveTypeName = 'ลาป่วย';
                    } else if (activeLeave.type === 'personal') {
                        badgeClass = 'badge-personal';
                        leaveTypeName = 'ลากิจ';
                    } else if (activeLeave.type === 'annual') {
                        badgeClass = 'badge-annual';
                        leaveTypeName = 'ลาพักร้อน';
                    }

                    if (activeLeave.status === 'pending_cancel') {
                        badgeClass += ' badge-pending-cancel';
                    } else if (isHalfDay) {
                        badgeClass += ' badge-half';
                    }

                    const dateRangeStr = activeLeave.startDate === activeLeave.endDate 
                        ? formatThaiShort(new Date(activeLeave.startDate))
                        : `${formatThaiShort(new Date(activeLeave.startDate))} - ${formatThaiShort(new Date(activeLeave.endDate))}`;
                    
                    const tooltipMsg = `${emp.name}: ${leaveTypeName}${halfText}${pendingCancelText}\nช่วงวันที่: ${dateRangeStr}\nจำนวน: ${activeLeave.days} วัน\nเหตุผล: "${activeLeave.reason}"`;

                    cellContent += `
                        <div class="calendar-leave-item">
                            <span class="badge ${badgeClass}" data-tooltip="${tooltipMsg}">
                                <strong class="emp-name-badge">${emp.name}</strong>: ${leaveTypeName}${halfText}${pendingCancelText}
                            </span>
                        </div>
                    `;
                });
            }

            // 4. Default: all working normally if no leaves, no sunday, and no holiday
            if (activeLeaves.length === 0 && dayOfWeek !== 0 && !isHoliday(colDateStr)) {
                cellContent += `
                    <div class="calendar-working-block">
                        <i class="fa-solid fa-circle-check text-success" style="color: var(--success);"></i>
                        <span style="color: var(--success);">ปฏิบัติงานปกติ</span>
                    </div>
                `;
            }

            tdDay.innerHTML = `<div class="calendar-cell-wrapper">${cellContent}</div>`;
            tr.appendChild(tdDay);
        }

        tbody.appendChild(tr);

        // Set up cell highlights on hover
        const cells = tbody.querySelectorAll('td[data-day-idx]');
        cells.forEach(cell => {
            cell.addEventListener('mouseenter', () => {
                const idx = cell.getAttribute('data-day-idx');
                const th = document.querySelector(`.calendar-table thead th[data-day="${parseInt(idx) + 1}"]`);
                if (th) th.classList.add('col-highlight');
            });
            cell.addEventListener('mouseleave', () => {
                const idx = cell.getAttribute('data-day-idx');
                const th = document.querySelector(`.calendar-table thead th[data-day="${parseInt(idx) + 1}"]`);
                if (th) th.classList.remove('col-highlight');
            });
        });
    }

    /* ----------------------------------------------------
       6B. LOGIN PORTAL
       ---------------------------------------------------- */

    function renderLoginSelection() {
        const grid = document.getElementById('login-employee-grid');
        grid.innerHTML = '';

        state.employees.forEach(emp => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'login-emp-btn';
            if (state.selectedEmployeeForLogin && state.selectedEmployeeForLogin.id === emp.id) {
                btn.classList.add('selected');
            }

            btn.innerHTML = `
                <span class="avatar" style="background-color: ${emp.color || '#3b82f6'}">${emp.initial || emp.name.charAt(0)}</span>
                <span class="name">${emp.name}</span>
            `;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.login-emp-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                state.selectedEmployeeForLogin = emp;
                
                const pinSection = document.getElementById('login-pin-section');
                pinSection.classList.remove('disabled');
                
                state.pinBuffer = '';
                updatePinDots();
                document.getElementById('login-error').classList.add('hidden');
            });

            grid.appendChild(btn);
        });
    }

    function resetPinPad() {
        state.selectedEmployeeForLogin = null;
        state.pinBuffer = '';
        updatePinDots();
        
        document.getElementById('login-pin-section').classList.add('disabled');
        document.getElementById('login-error').classList.add('hidden');
        
        document.querySelectorAll('.login-emp-btn').forEach(b => b.classList.remove('selected'));
    }

    function updatePinDots() {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((dot, idx) => {
            if (idx < state.pinBuffer.length) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    document.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!state.selectedEmployeeForLogin) return;

            const val = btn.getAttribute('data-val');
            const errorBanner = document.getElementById('login-error');
            errorBanner.classList.add('hidden');

            if (val === 'C') {
                state.pinBuffer = '';
                updatePinDots();
            } else if (val === 'B') {
                if (state.pinBuffer.length > 0) {
                    state.pinBuffer = state.pinBuffer.slice(0, -1);
                    updatePinDots();
                }
            } else {
                if (state.pinBuffer.length < 4) {
                    state.pinBuffer += val;
                    updatePinDots();

                    if (state.pinBuffer.length === 4) {
                        setTimeout(() => {
                            if (state.pinBuffer.toString() === state.selectedEmployeeForLogin.pin.toString()) {
                                state.currentUser = state.selectedEmployeeForLogin;
                                sessionStorage.setItem('nice_logged_in_user', state.currentUser.id);
                                
                                showToast(`ยินดีต้อนรับ!`, `เข้าสู่ระบบในฐานะคุณ ${state.currentUser.name} เรียบร้อยแล้ว`);
                                resetPinPad();
                                switchView('portal');
                            } else {
                                errorBanner.classList.remove('hidden');
                                state.pinBuffer = '';
                                updatePinDots();
                                
                                const pinSec = document.getElementById('login-pin-section');
                                pinSec.classList.add('animate-shake');
                                setTimeout(() => pinSec.classList.remove('animate-shake'), 300);
                            }
                        }, 100);
                    }
                }
            }
        });
    });

    /* ----------------------------------------------------
       6C. EMPLOYEE PORTAL & LEAVE FORM
       ---------------------------------------------------- */

    function isCurrentUserApprover() {
        if (!state.currentUser) return false;
        // Check if name contains 'ณัสวรรณ'
        if (state.currentUser.name && state.currentUser.name.includes("ณัสวรรณ")) return true;
        // Fallback for offline static list if no Nasawan is present
        const hasNasawan = state.employees.some(e => e.name && e.name.includes("ณัสวรรณ"));
        if (!hasNasawan && state.currentUser.id === 'nice001') {
            return true;
        }
        return false;
    }

    function renderAdminApprovalPanel() {
        const tbody = document.getElementById('admin-approval-tbody');
        const emptyState = document.getElementById('admin-approval-empty');
        const pendingCountBadge = document.getElementById('admin-pending-count');
        const table = document.querySelector('.admin-approval-table');
        
        if (!tbody || !emptyState || !pendingCountBadge || !table) return;
        
        tbody.innerHTML = '';
        
        // Find all leaves in the system that are 'pending_cancel'
        const pendingCancels = state.leaves.filter(l => l.status === 'pending_cancel');
        
        pendingCountBadge.innerText = `${pendingCancels.length} คำขอค้างอยู่`;
        
        if (pendingCancels.length === 0) {
            emptyState.classList.remove('hidden');
            table.classList.add('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        table.classList.remove('hidden');
        
        pendingCancels.forEach(l => {
            const emp = state.employees.find(e => e.id === l.employeeId);
            const empName = emp ? emp.name : 'ไม่ระบุชื่อ';
            const empInitial = emp ? emp.initial : 'E';
            const empColor = emp ? emp.color : '#3b82f6';
            
            let badgeClass = '';
            let typeName = '';
            if (l.type === 'sick') { badgeClass = 'badge-sick'; typeName = 'ลาป่วย'; }
            else if (l.type === 'personal') { badgeClass = 'badge-personal'; typeName = 'ลากิจ'; }
            else if (l.type === 'annual') { badgeClass = 'badge-annual'; typeName = 'ลาพักร้อน'; }
            
            const halfText = l.halfDay === 'morning' ? '<span class="text-amber" style="display:block; font-size:10px;">(ครึ่งวันเช้า)</span>' : (l.halfDay === 'afternoon' ? '<span class="text-indigo" style="display:block; font-size:10px;">(ครึ่งวันบ่าย)</span>' : '');
            
            const dateStr = l.startDate === l.endDate
                ? formatThaiFull(new Date(l.startDate))
                : `${formatThaiFull(new Date(l.startDate))}<br><span style="color:var(--text-muted)">ถึง</span> ${formatThaiFull(new Date(l.endDate))}`;
            
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td data-label="พนักงาน">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="user-avatar" style="background-color: ${empColor}; width: 28px; height: 28px; font-size: 11px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-weight:600;">${empInitial}</span>
                        <strong style="color: var(--text-primary); font-size: 13.5px;">${empName}</strong>
                    </div>
                </td>
                <td data-label="ประเภท">
                    <span class="badge ${badgeClass}">${typeName}</span>
                    ${halfText}
                </td>
                <td data-label="ช่วงวันที่ลา" style="line-height: 1.4;">${dateStr}</td>
                <td data-label="จำนวนวัน" style="font-weight: 600; font-family: var(--font-primary);">${l.days} วัน</td>
                <td data-label="เหตุผลการลา" style="max-width: 200px; white-space: normal; line-height: 1.4;">${l.reason}</td>
                <td data-label="การดำเนินการ" style="text-align: center;">
                    <div class="approval-actions-cell">
                        <button class="btn btn-approve btn-sm btn-admin-approve" data-id="${l.id}">
                            <i class="fa-solid fa-circle-check"></i> อนุมัติยกเลิก
                        </button>
                        <button class="btn btn-reject btn-sm btn-admin-reject" data-id="${l.id}">
                            <i class="fa-solid fa-circle-xmark"></i> ปฏิเสธ
                        </button>
                    </div>
                </td>
            `;
            
            // Add click event listeners
            tr.querySelector('.btn-admin-approve').addEventListener('click', async () => {
                if (confirm(`คุณต้องการอนุมัติการยกเลิกวันลาของ คุณ ${empName} ใช่หรือไม่? (วันลานี้จะไม่มีผลและโควตาจะคืนกลับไป)`)) {
                    const success = await updateLeaveStatusOnServer(l.id, 'cancelled');
                    if (success) {
                        showToast('อนุมัติยกเลิกวันลาแล้ว', `ยกเลิกวันลาของ คุณ ${empName} เรียบร้อยแล้ว`, 'success');
                        renderEmployeeDashboard();
                        renderWeeklyCalendar();
                        renderStatsDashboard();
                    }
                }
            });
            
            tr.querySelector('.btn-admin-reject').addEventListener('click', async () => {
                if (confirm(`คุณต้องการปฏิเสธการยกเลิกวันลาของ คุณ ${empName} และกู้คืนรายการนี้กลับเป็นปกติ ใช่หรือไม่?`)) {
                    const success = await updateLeaveStatusOnServer(l.id, 'approved');
                    if (success) {
                        showToast('ปฏิเสธการยกเลิกแล้ว', `กู้คืนสถานะวันลาของ คุณ ${empName} กลับเป็นปกติแล้ว`, 'success');
                        renderEmployeeDashboard();
                        renderWeeklyCalendar();
                        renderStatsDashboard();
                    }
                }
            });
            
            tbody.appendChild(tr);
        });
    }

    function renderEmployeeDashboard() {
        if (!state.currentUser) return;

        const user = state.currentUser;

        // 1. Welcome Card Elements
        document.getElementById('emp-avatar').innerText = user.initial || user.name.charAt(0);
        document.getElementById('emp-avatar').style.backgroundColor = user.color || '#3b82f6';
        document.getElementById('emp-name').innerText = user.name;
        document.getElementById('emp-role-dept').innerText = `${user.role || 'พนักงาน'} • Nicecenter Oil`;

        // Toggle Admin section visibility
        const adminSection = document.getElementById('admin-approval-section');
        if (adminSection) {
            if (isCurrentUserApprover()) {
                adminSection.classList.remove('hidden');
                renderAdminApprovalPanel();
            } else {
                adminSection.classList.add('hidden');
            }
        }

        // 2. Load Leave balances
        updateQuotaCards();

        // 3. Reset form
        resetLeaveRequestForm();

        // 4. Render History
        renderLeaveHistory();
    }

    function updateQuotaCards() {
        const quota = getLeaveQuotaStatus(state.currentUser.id);
        const r = 40;
        const circumference = 2 * Math.PI * r;

        const updateRing = (ringId, remId, usedId, quotaData, maxValId) => {
            const ring = document.getElementById(ringId);
            const remSpan = document.getElementById(remId);
            const usedSpan = document.getElementById(usedId);
            
            // Update max visual limit text in card footer
            if (maxValId) {
                document.getElementById(maxValId).innerText = quotaData.total;
            }

            remSpan.innerText = quotaData.rem;
            usedSpan.innerText = quotaData.used;

            // Prevent dividing by zero if quota is set to 0
            const total = quotaData.total || 1;
            const percent = (quotaData.rem / total) * 100;
            const offset = circumference - (percent / 100) * circumference;
            
            ring.style.strokeDasharray = circumference;
            ring.style.strokeDashoffset = offset;
        };

        // Custom labels to override card totals dynamically
        updateRing('ring-sick', 'quota-sick-rem', 'quota-sick-used', quota.sick, null);
        document.querySelector('.quota-card.border-sick .quota-footer span').innerHTML = `ใช้ไป <strong id="quota-sick-used">${quota.sick.used}</strong> จาก ${quota.sick.total} วัน`;
        
        updateRing('ring-personal', 'quota-personal-rem', 'quota-personal-used', quota.personal, null);
        document.querySelector('.quota-card.border-personal .quota-footer span').innerHTML = `ใช้ไป <strong id="quota-personal-used">${quota.personal.used}</strong> จาก ${quota.personal.total} วัน`;
        
        updateRing('ring-annual', 'quota-annual-rem', 'quota-annual-used', quota.annual, null);
        document.querySelector('.quota-card.border-annual .quota-footer span').innerHTML = `ใช้ไป <strong id="quota-annual-used">${quota.annual.used}</strong> จาก ${quota.annual.total} วัน`;
    }

    function renderLeaveHistory() {
        const tbody = document.getElementById('history-tbody');
        const emptyState = document.getElementById('history-empty');
        tbody.innerHTML = '';

        const userLeaves = state.leaves
            .filter(l => l.employeeId === state.currentUser.id)
            .sort((a, b) => b.startDate.localeCompare(a.startDate));

        if (userLeaves.length === 0) {
            emptyState.classList.remove('hidden');
            document.querySelector('.history-table').classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        document.querySelector('.history-table').classList.remove('hidden');

        userLeaves.forEach(l => {
            const tr = document.createElement('tr');
            
            let badgeClass = '';
            let typeName = '';
            
            if (l.status === 'cancelled') {
                badgeClass = 'badge-cancelled';
            } else if (l.type === 'sick') {
                badgeClass = 'badge-sick';
            } else if (l.type === 'personal') {
                badgeClass = 'badge-personal';
            } else if (l.type === 'annual') {
                badgeClass = 'badge-annual';
            }
            
            if (l.type === 'sick') { typeName = 'ลาป่วย'; }
            else if (l.type === 'personal') { typeName = 'ลากิจ'; }
            else if (l.type === 'annual') { typeName = 'ลาพักร้อน'; }

            const halfText = l.halfDay === 'morning' ? '<span class="text-amber" style="display:block; font-size:10px;">(ครึ่งวันเช้า)</span>' : (l.halfDay === 'afternoon' ? '<span class="text-indigo" style="display:block; font-size:10px;">(ครึ่งวันบ่าย)</span>' : '');

            const dateStr = l.startDate === l.endDate
                ? formatThaiFull(new Date(l.startDate))
                : `${formatThaiFull(new Date(l.startDate))}<br><span style="color:var(--text-muted)">ถึง</span> ${formatThaiFull(new Date(l.endDate))}`;

            const todayStr = formatDateString(state.currentDate);
            let actionBtnHtml = '';
            
            if (l.status === 'pending_cancel') {
                actionBtnHtml = `
                    <span class="waiting-approval-txt" title="รอการตรวจสอบและอนุมัติการยกเลิก">
                        <i class="fa-solid fa-spinner"></i> รออนุมัติ
                    </span>
                `;
            } else if (l.status === 'cancelled') {
                actionBtnHtml = `
                    <span class="status-cancelled-txt" title="วันลานี้ได้รับการยกเลิกเสร็จสิ้น">
                        <i class="fa-solid fa-circle-xmark"></i> ยกเลิกแล้ว
                    </span>
                `;
            } else if (l.startDate >= todayStr && l.status === 'approved') {
                actionBtnHtml = `
                    <button class="btn btn-danger btn-sm btn-cancel-leave" data-id="${l.id}">
                        <i class="fa-solid fa-ban"></i> ยกเลิกวันลา
                    </button>
                `;
            } else {
                actionBtnHtml = `<span style="color: var(--text-muted); font-size: 12px;"><i class="fa-solid fa-lock"></i> บันทึกแล้ว</span>`;
            }

            tr.innerHTML = `
                <td>
                    <span class="badge ${badgeClass}">${typeName}</span>
                    ${halfText}
                </td>
                <td style="line-height: 1.4;">${dateStr}</td>
                <td style="font-weight: 600; font-family: var(--font-primary);">${l.days} วัน</td>
                <td style="max-width: 250px; white-space: normal; line-height: 1.4;">${l.reason}</td>
                <td>${actionBtnHtml}</td>
            `;

            const cancelBtn = tr.querySelector('.btn-cancel-leave');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', async () => {
                    const leaveId = cancelBtn.getAttribute('data-id');
                    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการส่งคำขอยกเลิกวันลานี้? (ต้องได้รับการอนุมัติก่อน วันลาจึงจะมีผลยกเลิก)')) {
                        const success = await updateLeaveStatusOnServer(leaveId, 'pending_cancel');
                        if (success) {
                            showToast('ส่งคำขอยกเลิกแล้ว', 'คำขอยกเลิกวันลาได้รับการบันทึก รอการอนุมัติ', 'success');
                            renderEmployeeDashboard();
                            renderWeeklyCalendar();
                            renderStatsDashboard();
                        }
                    }
                });
            }

            tbody.appendChild(tr);
        });
    }

    function resetLeaveRequestForm() {
        const form = document.getElementById('leave-request-form');
        form.reset();

        const todayStr = formatDateString(state.currentDate);
        document.getElementById('input-start-date').value = todayStr;
        document.getElementById('input-end-date').value = todayStr;
        
        document.getElementById('chk-half-day').checked = false;
        document.getElementById('group-half-day-period').classList.add('hidden');
        document.getElementById('group-end-date').classList.remove('hidden');
        document.getElementById('lbl-start-date').innerHTML = 'วันที่ลาเริ่มต้น <span class="required">*</span>';

        document.getElementById('form-error-msg').classList.add('hidden');

        updateLiveLeaveCalculation();
    }

    // ==========================================================================
    // 7. Live Form Validation & Calculations
    // ==========================================================================

    const inputStartDate = document.getElementById('input-start-date');
    const inputEndDate = document.getElementById('input-end-date');
    const chkHalfDay = document.getElementById('chk-half-day');
    const formError = document.getElementById('form-error-msg');
    const formErrorText = document.getElementById('form-error-text');
    const btnSubmit = document.getElementById('btn-submit-leave');

    function getSelectedLeaveType() {
        const radios = document.getElementsByName('leave-type');
        for (let r of radios) {
            if (r.checked) return r.value;
        }
        return 'sick';
    }

    function updateLiveLeaveCalculation() {
        const leaveType = getSelectedLeaveType();
        const isHalfDay = chkHalfDay.checked;
        const startDateStr = inputStartDate.value;
        const endDateStr = isHalfDay ? startDateStr : inputEndDate.value;

        const days = calculateWorkingDays(startDateStr, endDateStr, isHalfDay);
        document.getElementById('summary-total-days').innerText = `${days} วัน`;

        const validationResult = validateLeaveRequest(leaveType, startDateStr, endDateStr, isHalfDay, days);

        const summaryPanel = document.getElementById('form-live-summary');
        const balanceAfter = document.getElementById('summary-balance-after');

        if (validationResult.valid) {
            formError.classList.add('hidden');
            btnSubmit.removeAttribute('disabled');
            summaryPanel.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            summaryPanel.style.background = 'rgba(16, 185, 129, 0.05)';
            
            const quotas = getLeaveQuotaStatus(state.currentUser.id);
            const currentRem = quotas[leaveType].rem;
            const finalRem = currentRem - days;
            
            balanceAfter.innerText = `สิทธิ์หลังลา: ${finalRem} วัน`;
            balanceAfter.style.color = 'var(--text-secondary)';
        } else {
            formErrorText.innerText = validationResult.message;
            formError.classList.remove('hidden');
            btnSubmit.setAttribute('disabled', 'true');
            summaryPanel.style.borderColor = 'rgba(244, 63, 94, 0.3)';
            summaryPanel.style.background = 'rgba(244, 63, 94, 0.05)';
            
            balanceAfter.innerText = 'สิทธิ์ไม่พอหรือวันที่ไม่ถูกต้อง';
            balanceAfter.style.color = 'var(--sick)';
        }
    }

    function validateLeaveRequest(type, startStr, endStr, isHalfDay, requestedDays) {
        const todayStr = formatDateString(state.currentDate);

        if (!startStr || (!isHalfDay && !endStr)) {
            return { valid: false, message: 'กรุณากรอกวันที่ให้ครบถ้วน' };
        }

        if (!isHalfDay && startStr > endStr) {
            return { valid: false, message: 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด' };
        }



        if (requestedDays === 0) {
            return { valid: false, message: 'ช่วงวันที่เลือกตรงกับวันหยุดเสาร์-อาทิตย์ทั้งหมด' };
        }

        const quotas = getLeaveQuotaStatus(state.currentUser.id);
        const remaining = quotas[type].rem;
        if (requestedDays > remaining) {
            return { valid: false, message: `สิทธิ์วันลาคงเหลือของคุณไม่เพียงพอ (เหลืออยู่ ${remaining} วัน, ขอลา ${requestedDays} วัน)` };
        }

        let overlapFound = false;
        let overlapDetails = '';

        state.leaves.forEach(l => {
            if (l.employeeId === state.currentUser.id && (l.status === 'approved' || l.status === 'pending_cancel')) {
                let cur = new Date(startStr);
                let end = new Date(isHalfDay ? startStr : endStr);

                while (cur <= end) {
                    const curStr = formatDateString(cur);
                    if (curStr >= l.startDate && curStr <= l.endDate) {
                        if (curStr === l.startDate && isHalfDay && l.halfDay !== null) {
                            const reqPeriod = document.querySelector('input[name="half-day-period"]:checked').value;
                            if (reqPeriod === l.halfDay) {
                                overlapFound = true;
                                overlapDetails = `ซ้ำซ้อนกับวันลาก่อนหน้า (มีลาครึ่งวัน${l.halfDay === 'morning' ? 'เช้า' : 'บ่าย'}แล้ว)`;
                            }
                        } else {
                            overlapFound = true;
                            overlapDetails = `วันที่ขอลาซ้ำซ้อนกับช่วงที่คุณทำรายการไว้ก่อนแล้ว (${formatThaiShort(new Date(l.startDate))} - ${formatThaiShort(new Date(l.endDate))})`;
                        }
                    }
                    cur.setDate(cur.getDate() + 1);
                }
            }
        });

        if (overlapFound) {
            return { valid: false, message: overlapDetails };
        }

        return { valid: true, message: 'ข้อมูลถูกต้อง' };
    }

    document.getElementsByName('leave-type').forEach(radio => {
        radio.addEventListener('change', updateLiveLeaveCalculation);
    });

    inputStartDate.addEventListener('change', () => {
        if (chkHalfDay.checked) {
            inputEndDate.value = inputStartDate.value;
        }
        updateLiveLeaveCalculation();
    });
    
    inputEndDate.addEventListener('change', updateLiveLeaveCalculation);

    chkHalfDay.addEventListener('change', () => {
        const isHalfDay = chkHalfDay.checked;
        const groupEndDate = document.getElementById('group-end-date');
        const groupHalfDay = document.getElementById('group-half-day-period');
        const lblStartDate = document.getElementById('lbl-start-date');

        if (isHalfDay) {
            groupEndDate.classList.add('hidden');
            groupHalfDay.classList.remove('hidden');
            lblStartDate.innerHTML = 'วันที่ขอลาครึ่งวัน <span class="required">*</span>';
            inputEndDate.value = inputStartDate.value;
        } else {
            groupEndDate.classList.remove('hidden');
            groupHalfDay.classList.add('hidden');
            lblStartDate.innerHTML = 'วันที่ลาเริ่มต้น <span class="required">*</span>';
        }
        
        updateLiveLeaveCalculation();
    });

    document.getElementsByName('half-day-period').forEach(radio => {
        radio.addEventListener('change', updateLiveLeaveCalculation);
    });

    const leaveForm = document.getElementById('leave-request-form');
    leaveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const leaveType = getSelectedLeaveType();
        const isHalfDay = chkHalfDay.checked;
        const startDateStr = inputStartDate.value;
        const endDateStr = isHalfDay ? startDateStr : inputEndDate.value;
        const reasonStr = document.getElementById('input-reason').value.trim();

        const days = calculateWorkingDays(startDateStr, endDateStr, isHalfDay);
        const validation = validateLeaveRequest(leaveType, startDateStr, endDateStr, isHalfDay, days);

        if (!reasonStr) {
            showToast('กรอกข้อมูลไม่ครบ', 'กรุณาระบุเหตุผลการลาหยุดงานให้ชัดเจน', 'error');
            return;
        }

        if (!validation.valid) {
            showToast('บันทึกไม่สำเร็จ', validation.message, 'error');
            return;
        }

        const newLeave = {
            id: 'leave-' + Date.now(),
            employeeId: state.currentUser.id,
            type: leaveType,
            startDate: startDateStr,
            endDate: endDateStr,
            halfDay: isHalfDay ? document.querySelector('input[name="half-day-period"]:checked').value : null,
            reason: reasonStr,
            days: days,
            status: 'approved'
        };

        // Submit to Database (Cloud / Local)
        const success = await saveNewLeave(newLeave);

        if (success) {
            showToast('บันทึกสำเร็จ!', 'บันทึกวันลาของคุณเรียบร้อยแล้ว ระบบอัปเดตฐานข้อมูลกลางเรียบร้อย', 'success');
            renderEmployeeDashboard();
        }
    });

    // ==========================================================================
    // 8. Navigation Event Listeners
    // ==========================================================================

    document.getElementById('btn-goto-login').addEventListener('click', () => {
        switchView('login');
    });

    document.getElementById('btn-login-back').addEventListener('click', () => {
        switchView('calendar');
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
            state.currentUser = null;
            sessionStorage.removeItem('nice_logged_in_user');
            
            showToast('ออกจากระบบแล้ว', 'ข้อมูลเซสชันของคุณได้รับการล้างเรียบร้อย', 'success');
            switchView('calendar');
        }
    });

    document.getElementById('btn-back-to-home').addEventListener('click', () => {
        switchView('calendar');
    });

    // App Navigation Bar Click Events
    document.getElementById('nav-btn-calendar').addEventListener('click', () => {
        switchView('calendar');
    });

    document.getElementById('nav-btn-portal').addEventListener('click', () => {
        switchView('portal');
    });

    // Calendar Week Navigation
    document.getElementById('btn-prev-week').addEventListener('click', () => {
        const newMon = new Date(state.calendarWeekStart);
        newMon.setDate(newMon.getDate() - 7);
        state.calendarWeekStart = newMon;
        
        renderWeeklyCalendar();
        renderStatsDashboard();
    });

    document.getElementById('btn-next-week').addEventListener('click', () => {
        const newMon = new Date(state.calendarWeekStart);
        newMon.setDate(newMon.getDate() + 7);
        state.calendarWeekStart = newMon;
        
        renderWeeklyCalendar();
        renderStatsDashboard();
    });

    document.getElementById('btn-current-week').addEventListener('click', () => {
        state.calendarWeekStart = getMonday(state.currentDate);
        
        renderWeeklyCalendar();
        renderStatsDashboard();
    });

    // Theme Switcher Click Handler
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const body = document.body;
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            state.theme = 'light';
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            state.theme = 'dark';
        }
        localStorage.setItem('nice_theme', state.theme);
    });

    // ==========================================================================
    // 9. Application Launch / Initializer
    // ==========================================================================
    
    async function initApp() {
        // Show initial loading state or info in console
        console.log("Nice HR: Application initializing...");
        
        // 1. Load active registry (Cloud sheets OR local fallback storage)
        await loadAllData();

        // 2. Load settings and session
        initLocalStorage();

        // 3. Apply theme from storage
        const body = document.body;
        if (state.theme === 'light') {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
        }

        // Set Calendar View Week starting
        state.calendarWeekStart = getMonday(state.currentDate);

        // Switch to the default view or the portal if already logged in
        if (state.currentUser) {
            switchView('portal');
        } else {
            switchView('calendar');
        }
    }

    // Fire the application!
    initApp();
});
