// Basic client-side navigation and form handling
import { db, storage } from './firebase.js';
import {
  doc, setDoc, getDoc, increment, updateDoc, orderBy, onSnapshot, arrayUnion, arrayRemove,
  collection, addDoc, query, getDocs, deleteDoc, serverTimestamp, where
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import {signOut} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject     
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

async function getPoints(phone) {
  const snap = await getDoc(doc(db, 'users', phone));
  return snap.exists() ? snap.data().points : 0;
}

const phone = localStorage.getItem('loggedInUser');

document.addEventListener('DOMContentLoaded', async () => {
    // --- Login Page (index.html) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const phone = document.getElementById('phone').value.trim();
            const pw = document.getElementById('password').value.trim();
            if (!phone || !pw) return alert('전화번호와 비밀번호를 입력하세요.');

            const userRef = doc(db, 'users', phone);
            const snap = await getDoc(userRef);

            if (!snap.exists()) {
                return alert('등록되지 않은 전화번호입니다.');
            }

            const data = snap.data();
            if (data.password !== pw) {
                return alert('비밀번호가 일치하지 않습니다.');
            }

            localStorage.setItem('loggedInUser', phone);  // 로그인 유지용
            alert('로그인 성공!');
            window.location.href = 'main.html';
        });
    }

    // --- Signup Page (signup.html) ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const phone = document.getElementById('signup-phone').value.trim();
            const pw = document.getElementById('signup-password').value.trim();
            if (!phone || !pw) return alert('전화번호와 비밀번호를 입력하세요.');

            const userRef = doc(db, 'users', phone);
            const existing = await getDoc(userRef);
            if (existing.exists()) {
                alert('이미 등록된 전화번호입니다.');
                return;
            }

            await setDoc(userRef, {
                phone: phone,
                password: pw,
                points: 0,
                createdAt: new Date()
            });

            alert('회원가입 성공! 로그인해주세요.');
            window.location.href = 'index.html';
        });
    }

    // --- Main Page (main.html) ---
    const createRoomButton = document.getElementById('create-room-button');
    const currentPointsSpan = document.getElementById('current-points');
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {              // Firebase Auth 로그인을 쓰고 있다면
            await signOut(db);
            } catch (e) {
            console.warn('signOut 무시', e);  // 아직 Auth를 안 써도 문제 없음
            }

            localStorage.removeItem('loggedInUser');   // 세션 초기화
            alert('로그아웃되었습니다.');
            window.location.href = 'index.html';       // 로그인 페이지로 이동
    });
}
    if (createRoomButton) {
        createRoomButton.addEventListener('click', () => {
            window.location.href = 'create-room.html';
        });
        
        // Display current points on main page
        if (currentPointsSpan && phone) {
            currentPointsSpan.textContent = `현재 Point: ${await getPoints(phone)}Pt`;
            currentPointsSpan.style.cursor = 'pointer'; // Indicate it's clickable
            currentPointsSpan.addEventListener('click', () => {
                window.location.href = 'points.html';
            });
        }

        // Load and display rooms when main page loads
        loadRooms();
    }

    // --- Create Room Page (create-room.html) ---
    const createRoomForm = document.getElementById('create-room-form');
    if (createRoomForm) {
        createRoomForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const height   = Number(document.getElementById('user-height').value);
            const weight   = Number(document.getElementById('user-weight').value);
            const bodyfat  = Number(document.getElementById('user-bodyfat').value);
            const targetBF = Number(document.getElementById('room-goal').value);
            const betting  = Number(document.getElementById('room-betting').value);
            const duration = Number(document.getElementById('room-duration').value);

            if (!height || !weight || isNaN(bodyfat) || isNaN(targetBF) || isNaN(betting) || isNaN(duration)) {
                return alert('모든 필드를 올바르게 입력해주세요.');
            }

            const newRoom = {
                height:   height,
                weight:   weight,
                bodyfat:  bodyfat,
                goal:     targetBF,
                betting:  betting,
                duration: duration
            };

            try {
                await saveRoom(newRoom);
                alert('방이 성공적으로 생성되었습니다!');
                window.location.href = 'main.html';
            } catch (err) {
                console.error('방 생성 실패', err);
                alert('방 생성 실패: ' + err.message);
            }
        });
    }

    // --- Point Management Page (points.html) ---
    const currentPointsDisplay = document.getElementById('current-points-display');
    const chargeButton = document.getElementById('charge-button');
    const refundButton = document.getElementById('refund-button');

    if (currentPointsDisplay) {
        currentPointsDisplay.textContent = `${await getPoints(phone)} pt`;
    }

    if (chargeButton) {
        chargeButton.addEventListener('click', () => {
            window.location.href = 'charge-points.html';
        });
    }

    if (refundButton) {
        refundButton.addEventListener('click', () => {
            window.location.href = 'refund-points.html';
        });
    }

    // --- Charge Points Page (charge-points.html) ---
    const chargeAmountInput = document.getElementById('charge-amount');
    const processChargeButton = document.getElementById('process-charge');
    const cancelChargeButton = document.getElementById('cancel-charge');

    if (processChargeButton) {
        processChargeButton.addEventListener('click', async () => {
            const amount = Number(chargeAmountInput.value);
            if (!isNaN(amount) && amount > 0) {
            await addDoc(collection(db, 'pointRequests'), {
                user:    phone,
                type:    'charge',
                amount,
                createdAt: serverTimestamp()
            });
            alert('충전 요청이 제출되었습니다.\n관리자 승인 후 반영됩니다.');
            location.href = 'points.html';
            } else {
            alert('유효한 금액을 입력해주세요.');
            }
        });
    }


    if (cancelChargeButton) {
         cancelChargeButton.addEventListener('click', () => {
             window.location.href = 'points.html';
         });
    }

    // --- Refund Points Page (refund-points.html) ---
     const refundAmountInput = document.getElementById('refund-amount');
     const bankNameInput = document.getElementById('bank-name');
     const accountNumberInput = document.getElementById('account-number');
     const accountHolderInput = document.getElementById('account-holder');
     const processRefundButton = document.getElementById('process-refund');
     const cancelRefundButton = document.getElementById('cancel-refund');

    if (processRefundButton) {
        processRefundButton.addEventListener('click', async () => {
            const amount  = Number(refundAmountInput.value);
            const bankName = bankNameInput.value.trim();
            const accountNumber = accountNumberInput.value.trim();
            const accountHolder = accountHolderInput.value.trim();

            const current = await getPoints(phone);
            if (amount > 0 && current >= amount) {
                await addDoc(collection(db, 'pointRequests'), {
                    user:    phone,
                    type:    'refund',
                    amount,
                    bankName,
                    accountNumber,
                    accountHolder,
                    createdAt: serverTimestamp()
                });
                alert('환급 요청이 제출되었습니다.\n관리자 승인 후 반영됩니다.');
                location.href = 'points.html';
            } else {
                alert('보유 포인트가 부족합니다.');
            }
        });
    }

     if (cancelRefundButton) {
          cancelRefundButton.addEventListener('click', () => {
              window.location.href = 'points.html';
          });
     }

     // --- Room Detail Page (room-detail.html) ---
    if (document.querySelector('.opponent-info-section')) {
        loadRoomDetail();
        //subscribeSubmissions(); // ▶ 제출 내역 구독 시작
        setupGoSubmitBtn();
    }

    if (document.getElementById('submitResultsBtn')) {
        setupSubmitResults();
    }
    
    function setupGoSubmitBtn() {
        const room = JSON.parse(localStorage.getItem('currentRoom'));
        const btn  = document.getElementById('goSubmitBtn');
        if (!btn || !room.id) return;
        btn.addEventListener('click', () => {
            window.location.href = `submit_results.html?roomId=${room.id}`;
        });
        
        if (btn) {
            btn.disabled = room.isClosed !== true;   // 저장되기 전엔 항상 비활성
        }
    }

    async function loadRoomDetail() {
        /* 1. roomId를 URL에서 받고 최신 스냅 읽기 */
        const params = new URLSearchParams(location.search);
        const roomId = params.get('roomId');
        if (!roomId) return (location.href = 'main.html');

        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
            alert('방 정보를 찾을 수 없습니다.');
            return (location.href = 'main.html');
        }
        const room = { id: roomId, ...roomSnap.data() };
        localStorage.setItem('currentRoom', JSON.stringify(room));   // 최신 값 캐시
        // 3) 로그인 유저와 호스트 여부 확인
        const me = localStorage.getItem('loggedInUser'); // 예: 전화번호 또는 UID
        const isHost = me === room.host;
        const isParticipant = (room.participants || []).includes(me); 

        /* 2. “이미 비디오를 올렸지만 아직 대결 전”이면 battle-screen 으로 */
        const mySnap = await getDocs(query(
            collection(db, 'rooms', roomId, 'submissions'),
            where('uploader', '==', phone)
        ));
        const allAccepted = (room.accepted ?? []).length === room.participants.length;
        const started     = allAccepted && room.startAt;
        if (mySnap.size > 0 && !started) {
            return location.replace(`battle-screen.html?roomId=${roomId}`);
        }

        /* 3. 화면 채우기 */
        try {
                   // 4) **호스트 정보 표시 (Firestore 필드: height, weight, bodyfat)**
        //    → create-room.html 에서 저장된 필드명(height, weight, bodyfat) 사용
        const hostInfoContainer = document.getElementById('hostInfoContainer');
        hostInfoContainer.innerHTML = ''; // 초기화
        if (room.height && room.weight && room.bodyfat) {
            hostInfoContainer.innerHTML = `
                <div class="info-item">
                    <div class="label">몸무게</div>
                    <div class="value">${room.weight}kg</div>
                </div>
                <div class="info-item">
                    <div class="label">키</div>
                    <div class="value">${room.height}cm</div>
                </div>
                <div class="info-item">
                    <div class="label">체지방량</div>
                    <div class="value">${room.bodyfat}%</div>
                </div>
            `;
        } else {
            // create-room 단계에서 호스트 정보가 저장되지 않은 경우
            hostInfoContainer.innerHTML = `<p style="color:gray;">방장 정보가 없습니다.</p>`;
        }

        // 5) 참가자 정보 입력 폼 처리 (호스트가 아닌 사용자에게만 보임)
        const participantFormContainer = document.getElementById('participantInfoFormContainer');
        participantFormContainer.innerHTML = ''; // 초기화
        if (!isHost) {
            // 아직 참가자 정보(opponentHeight/Weight/Bodyfat)가 없다면 폼 노출
            if (!room.opponentHeight || !room.opponentWeight || !room.opponentBodyfat) {
                participantFormContainer.innerHTML = `
                    <div style="border:1px solid #ddd; padding:20px; border-radius:8px;">
                        <h3>내 정보 입력</h3>
                        <form id="participantInfoForm">
                            <div class="form-group">
                                <label for="participant-height">키 (cm)</label>
                                <input type="number" id="participant-height" required />
                            </div>
                            <div class="form-group">
                                <label for="participant-weight">몸무게 (kg)</label>
                                <input type="number" id="participant-weight" required />
                            </div>
                            <div class="form-group">
                                <label for="participant-bodyfat">체지방량 (%)</label>
                                <input type="number" id="participant-bodyfat" required />
                            </div>
                            <button type="submit" class="button">정보 저장</button>
                        </form>
                    </div>
                `;
                // 폼 제출 이벤트 바인딩
                document.getElementById('participantInfoForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const height = Number(document.getElementById('participant-height').value);
                    const weight = Number(document.getElementById('participant-weight').value);
                    const bodyfat = Number(document.getElementById('participant-bodyfat').value);

                    if (!height || !weight || !bodyfat) {
                        return alert('모든 필드를 올바르게 입력해주세요.');
                    }

                    try {
                        // Firestore 방 문서에 opponent 필드 추가/업데이트
                        await updateDoc(roomRef, {
                            opponentHeight: height,
                            opponentWeight: weight,
                            opponentBodyfat: bodyfat,
                            isClosed: true,
                            participants:   arrayUnion(me)
                        });
                        alert('정보가 저장되었습니다.');
                        // 폼 대신 안내 메시지로 대체
                        participantFormContainer.innerHTML =
                            '<p style="color:green;">내 정보가 저장되었습니다.</p>';
                        // 저장 후 새로 로드하여 화면 갱신
                        await loadRoomDetail();
                    } catch (err) {
                        console.error('참가자 정보 저장 실패', err);
                        alert('정보 저장에 실패했습니다. 다시 시도해주세요.');
                    }
                });
            }
        }

        // 6) 상대방 정보 표시 (opponentHeight/Weight/Bodyfat)
        const opponentSection       = document.querySelector('.opponent-info-section'); 
        const opponentInfoContainer = document.getElementById('opponentInfoContainer');
        opponentInfoContainer.innerHTML = ''; // 초기화
        if (isParticipant) {
            opponentSection.style.display = 'block'; 
            if (room.opponentHeight && room.opponentWeight && room.opponentBodyfat) {
                opponentInfoContainer.innerHTML = `
                    <div class="info-item">
                        <div class="label">몸무게</div>
                        <div class="value">${room.opponentWeight}kg</div>
                    </div>
                    <div class="info-item">
                        <div class="label">키</div>
                        <div class="value">${room.opponentHeight}cm</div>
                    </div>
                    <div class="info-item">
                        <div class="label">체지방량</div>
                        <div class="value">${room.opponentBodyfat}%</div>
                    </div>
                `;
            } else {
                // 상대방 정보가 없으면 메시지만 표시
                opponentInfoContainer.innerHTML =
                    '<p style="color:gray; padding:20px;">상대방이 입장하지 않았습니다.</p>';
            }
        } else {
            opponentSection.style.display = 'none';  
        } 

        // 7) 목표 설정(호스트가 지정한 goal, duration, betting) 채우기
        
         // 7) 목표 설정 (호스트 현재 체지방량 - 목표 체지방률 = 목표 감량) 계산·표시
         if (room.bodyfat != null && room.goal != null) {
             const reduction = (Number(room.bodyfat) - Number(room.goal)).toFixed(1);
             document.getElementById('detail-goal-reduction').textContent = `${reduction}%p`;
         } else {
             document.getElementById('detail-goal-reduction').textContent = 'N/A';
         }
         document.getElementById('detail-duration').textContent = (room.duration || 'N/A') + '초';
         document.getElementById('detail-betting').textContent = (room.betting || 'N/A') + 'pt';

            /* 4. 타이머·버튼 상태는 subscribeRoomTimer 가 담당 */
        subscribeRoomTimer(room.id, room.duration, isHost);

        } catch (e) {
            console.error('Populate error', e);
            alert('방 상세 정보를 불러오는데 실패했습니다.');
        }
    }  
    function subscribeRoomTimer(roomId, durationField, isHost) {
        const body = document.getElementById('roomDetailBody');
        const loader = document.getElementById('loader');
        const btn = document.getElementById('goSubmitBtn');
        const txt = document.querySelector('.acceptance-text');
        const timer = document.getElementById('countdownTimer');

        const durSec = Number(durationField) || 30;
        let firstSnap = true;
        let intId = null;
        let resetDone = false;

        onSnapshot(doc(db, 'rooms', roomId), snap => {
            if (!snap.exists()) return;
            const d = snap.data();
            const acceptedCnt = (d.accepted || []).length;
            const allAccepted = acceptedCnt === d.participants.length;
            const started = allAccepted && d.startAt;

            // ① 최초 스냅샷 → 로딩 → 화면 표시
            if (firstSnap) {
                loader.style.display = 'none';
                body.style.display = 'block';
                firstSnap = false;
            }

            // ② 대결 전 (게임 시작 전)
            if (!started) {
                clearInterval(intId);
                const infoComplete = d.isClosed === true;
                btn.disabled = !infoComplete;
                txt.style.display = 'block';
                btn.style.display = 'block';
                // 호스트는 '인증하기', 참가자는 '신청하기'
                btn.textContent = isHost ? '인증하기' : '신청하기';
                timer.style.display = 'none';
                return;
            }

            // ③ 대결 시작 후 (타이머)
            txt.style.display = 'none';
            btn.style.display = 'none';
            timer.style.display = 'block';

            const startMs = d.startAt.toMillis();
            const endMs = startMs + durSec * 1000;

            clearInterval(intId);
            intId = setInterval(async () => {
                const remain = Math.max(0, Math.floor((endMs - Date.now()) / 1000));

                if (remain === 0) {
                    clearInterval(intId);
                    if (!resetDone) {
                        // 대결 종료 시, sub컬렉션 파일 & 문서 정리
                        const subs = await getDocs(collection(db, 'rooms', roomId, 'submissions'));
                        for (const s of subs.docs) {
                            const { storagePath } = s.data();
                            if (storagePath) await deleteObject(storageRef(storage, storagePath));
                            await deleteDoc(s.ref);
                        }
                        resetDone = true;
                    }
                    timer.style.display = 'none';
                    btn.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = '인증하기';
                    btn.onclick = () => {
                        location.href = `submit_endresults.html?roomId=${roomId}`;
                    };
                } else {
                    timer.textContent = `목표까지 ${remain} 초`;
                }
            }, 1000);
        });
    }

    // --- Submit Results Page (submit_results.html) ---
    // document.addEventListener('DOMContentLoaded', function() {
    //     const backButton = document.getElementById('back-btn');
    //     if (backButton) {
    //         backButton.addEventListener('click', function() {
    //             window.location.href = 'room-detail.html';
    //         });
    //     }
    // });

    function setupSubmitResults() {
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('roomId');
        const uploadArea      = document.getElementById('uploadArea');
        const uploadLink      = uploadArea.querySelector('.upload-link');
        const fileInput       = document.getElementById('videoInput');
        const videoPreview    = document.getElementById('videoPreview');
        const imagePreview    = document.getElementById('imagePreview');
        const fileNameEl      = document.getElementById('fileName');
        const removeVideoBtn  = document.getElementById('removeVideoBtn');

        if (!roomId) {
            alert('잘못된 접근입니다.');
            return window.location.href = 'main.html';
        }
        // 2) 업로드 텍스트(또는 업로드 영역) 클릭 시 파일 선택창 열기
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // 3) 파일 선택 후 미리보기 & 파일명 표시
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;

            // 비디오 미리보기
            /* 미리보기 초기화 */
            videoPreview.style.display = 'none';
            imagePreview.style.display = 'none';

            /* 파일 유형별 분기 */
            if (file.type.startsWith('video/')) {
                videoPreview.src = URL.createObjectURL(file);
                videoPreview.style.display = 'block';
            } else if (file.type.startsWith('image/')) {
                imagePreview.src  = URL.createObjectURL(file);
                imagePreview.style.display = 'block';
            }

            // 파일명 표시
            fileNameEl.textContent = file.name;
            fileNameEl.style.display = 'inline';

            // 제거 버튼 보이기
            removeVideoBtn.style.display = 'inline-block';

            // 안내 문구 변경(Optional)
            uploadLink.textContent = '다른 영상을 업로드 하려면 다시 클릭하세요.';
        });

        // 4) 제거 버튼 클릭 시 리셋
        removeVideoBtn.addEventListener('click', (e) => {
            e.stopPropagation();       // uploadArea 클릭 이벤트 방지
            fileInput.value = '';     // 선택 초기화

            videoPreview.src = '';
            videoPreview.style.display = 'none';
            imagePreview.src      = '';
            imagePreview.style.display = 'none';
            fileNameEl.style.display = 'none';
            removeVideoBtn.style.display = 'none';

            uploadLink.textContent = '영상을 업로드 해주세요.';
        });

        // “뒤로가기” 링크가 있다면 room-detail 로 복귀
        const back = document.querySelector('.back-btn');
        if (back) back.href = `room-detail.html?roomId=${roomId}`;

        const input = document.getElementById('videoInput');
        const btn   = document.getElementById('submitResultsBtn');
        btn.addEventListener('click', async () => {
            if (!input.files.length) return alert('영상을 선택해주세요.');
            const file = input.files[0];
            const uploader = localStorage.getItem('loggedInUser');
            const path = `rooms/${roomId}/${uploader}/results/${Date.now()}_${file.name}`;
            const ref  = storageRef(storage, path);

            try {
            await uploadBytes(ref, file);
            const url = await getDownloadURL(ref);

            await addDoc(
                collection(db, 'rooms', roomId, 'submissions'),
                {
                    uploader,               // 유저별 분리 표시
                    fileName: file.name,
                    url,
                    contentType: file.type,
                    storagePath: path,      // 실제 Storage 경로 (선택)
                    createdAt: serverTimestamp()
                }
            );

            alert('제출이 완료되었습니다!');
            window.location.href = `battle-screen.html?roomId=${roomId}`;
            } catch (e) {
            console.error(e);
            alert('업로드 중 오류가 발생했습니다.');
            }
        });
    }


    // --- Helper functions for localStorage ---
    async function saveRoom(room) {
        try {
            await addDoc(collection(db, 'rooms'), {
                ...room,
                host: phone,
                participants: [phone],
                isClosed: false,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error('방 쓰기 실패', e);
            alert('방 생성 실패: ' + e.message);
            throw e;              // 상위에서 catch
        }
    }

    async function loadRooms() {
        const roomListDiv = document.querySelector('.room-list');
        const snaps = await getDocs(query(collection(db, 'rooms')));

        roomListDiv.innerHTML = '';
        
        // 각 방마다 submissions 컬렉션을 확인해 flag 생성
        for (const docSnap of snaps.docs) {
            const room = { id: docSnap.id, ...docSnap.data() };
            const isParticipant = (room.participants || []).includes(phone);
            const isClosed      = room.isClosed === true; 
            const endSnap = await getDocs(
                collection(db, 'rooms', room.id, 'endSubmissions')
            );
            const finished = endSnap.size  >= 2;
        displayRoom(room, roomListDiv, { isClosed, finished, isParticipant });
        }
    }

    function displayRoom(room, containerElement,{ isClosed, finished, isParticipant }) {
        const roomElement = document.createElement('div');
        roomElement.classList.add('room-item');

        // Format the goal string for main page display
        const formattedGoal = (room.goal != null && !isNaN(room.goal))
            ? `목표 : 체지방 ${room.goal}%`
            : '목표 : N/A';

        // Displaying formatted Goal, Betting Amount, and Duration
        roomElement.innerHTML = `
            <h3>${formattedGoal}</h3>
            <p>💰 ${room.betting} | ⏰ ${room.duration}</p>
            <button class="join-room-button"></button>
            ${room.host === phone
            ? '<button class="delete-room-button">삭제</button>'
            : ''}
        `;

        const delBtn = roomElement.querySelector('.delete-room-button');
        if (delBtn) {
        delBtn.addEventListener('click', async () => {
            if (confirm('방을 삭제할까요?')) {
            await deleteDoc(doc(db, 'rooms', room.id));
            loadRooms();              // 화면 갱신
            }
        });
        }


        const joinButton = roomElement.querySelector('.join-room-button');
        if (finished) {
            joinButton.textContent = '종료됨';
            joinButton.disabled    = true;
            containerElement.appendChild(roomElement);
            return;                       // 아래 분기 실행 안 함
        }
        else if (isParticipant) {
            joinButton.textContent = '참여중';
            joinButton.addEventListener('click', () => {
                window.location.href = `room-detail.html?roomId=${room.id}`; //@
            });
            containerElement.appendChild(roomElement);
            return;
        }

        else if (isClosed) {
            joinButton.disabled = true;
            joinButton.textContent = '마감됨';
            containerElement.appendChild(roomElement);
            return;
        }
        else {                             // 4) 열린 방 – 새로 참가
            joinButton.textContent = '입장하기';
            joinButton.onclick = async () => { 
                localStorage.setItem('currentRoom', JSON.stringify(room));
                location.href = `room-detail.html?roomId=${room.id}`;
            }
        
        }

        // joinButton.addEventListener('click', async () => {
        //     localStorage.setItem('currentRoom', JSON.stringify(room));
        //     if (!room.participants.includes(phone)) {
        //         await updateDoc(
        //         doc(db, 'rooms', room.id),
        //         { participants: arrayUnion(phone) }
        //     );
        //     }
        //     // 본인 업로드 이력 확인
        //     const qUser = query(
        //     collection(db, 'rooms', room.id, 'submissions'),
        //     where('uploader', '==', phone)
        //     );
        //     const userSnap = await getDocs(qUser);
        //     const nextPage = userSnap.size > 0
        //     ? 'battle-screen.html'
        //     : 'room-detail.html';
        //     window.location.href = `${nextPage}?roomId=${room.id}`;
        // });

        containerElement.appendChild(roomElement);
    }
});

// ----- Battle Screen Page -----
    async function setupBattleScreen() {
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('roomId');
        if (!roomId) return alert('잘못된 접근입니다.');
        const roomRef = doc(db, 'rooms', roomId);

        // 1) 방 정보를 미리 읽어서 roomData에 저장
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
        alert('방 정보를 찾을 수 없습니다.');
        return;
        }
        const roomData = roomSnap.data();
        // 이제 roomData.host, roomData.height, roomData.weight, ...
        //     roomData.opponentHeight, roomData.opponentWeight, ... 를 쓸 수 있음

        // 2) 방 문서 업데이트(수락/시작 등) 감시
        onSnapshot(roomRef, snap => {
            if (!snap.exists()) return;
            const data        = snap.data();
            const acceptedCnt = (data.accepted ?? []).length;
            const allAccepted = acceptedCnt === data.participants.length;
            const started     = allAccepted && data.startAt;
            if (started) {
                window.location.replace(`room-detail.html?roomId=${roomId}`);
            }
        });

        const acceptBtn = document.getElementById('acceptBtn');
        const rejectBtn = document.getElementById('rejectBtn');
        if (acceptBtn) acceptBtn.disabled = true;
        if (rejectBtn) rejectBtn.disabled = true;

        const opponentEl = document.getElementById('opponentVideoContainer');
        const myEl       = document.getElementById('myVideoContainer');
        const statusEl   = document.getElementById('statusMessage');

        // 3) submissions 컬렉션 구독: 영상이 올라오면 렌더링
        const subsRef = collection(db, 'rooms', roomId, 'submissions');
        const q       = query(subsRef, orderBy('createdAt', 'asc'));

        onSnapshot(q, snapshot => {
            // ── 초기화 ──
            const wipe = el =>
                el.querySelectorAll('video,img,a,.media-item,.video-placeholder')
                .forEach(n => n.remove());
            wipe(opponentEl);
            wipe(myEl);

            // ── 업로더별 최신 문서만 선별 ──
            const latestByUploader = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const ts   = data.createdAt.toMillis();
                if (!latestByUploader[data.uploader] ||
                    ts > latestByUploader[data.uploader].data.createdAt.toMillis()) {
                    latestByUploader[data.uploader] = { docSnap, data };
                }
            });
            // ── (선택) 이전 문서는 제거 ──
            snapshot.forEach(docSnap => {
                const uploader = docSnap.data().uploader;
                if (latestByUploader[uploader].docSnap.id !== docSnap.id) {
                    deleteDoc(docSnap.ref);
                }
            });

            // ── 미디어 + 키·몸무게·체지방을 화면에 렌더링 ──
            Object.values(latestByUploader).forEach(({ data }) => {
                const box = document.createElement('div');
                box.className = 'media-item';

                // (1) 실제 영상 또는 이미지 엘리먼트 생성
                const isVideo = (data.contentType ?? '').startsWith('video/') 
                                || data.url.match(/\.(mp4|mov|webm)$/i);
                const isImage = (data.contentType ?? '').startsWith('image/') 
                                || data.url.match(/\.(png|jpe?g|gif|heic|webp)$/i);

                let media;
                if (isVideo) {
                    media = document.createElement('video');
                    media.src      = data.url;
                    media.controls = true;
                } else if (isImage) {
                    media = document.createElement('img');
                    media.src      = data.url;
                    media.alt      = '인증 사진';
                } else {
                    media = document.createElement('a');
                    media.href        = data.url;
                    media.textContent = '파일 보기';
                    media.target      = '_blank';
                }
                media.style.maxWidth = '100%';
                box.appendChild(media);

                // (2) 미디어 바로 아래에 키·몸무게·체지방량 표시
                const isHostUploader = (data.uploader === roomData.host);
                const infoDiv = document.createElement('div');
                infoDiv.className = 'info-block';
                if (isHostUploader) {
                    infoDiv.innerHTML = `
                        <div class="info-item">
                            <span class="info-key">키</span>
                            <span class="info-value">${roomData.height ?? 'N/A'}cm</span>
                        </div>
                        <div class="info-item">
                            <span class="info-key">몸무게</span>
                            <span class="info-value">${roomData.weight ?? 'N/A'}kg</span>
                        </div>
                        <div class="info-item">
                            <span class="info-key">체지방량</span>
                            <span class="info-value">${roomData.bodyfat ?? 'N/A'}%</span>
                        </div>
                    `;
                    } else {
                    infoDiv.innerHTML = `
                        <div class="info-item">
                        <span class="info-key">키</span>
                        <span class="info-value">${roomData.opponentHeight ?? 'N/A'}cm</span>
                        </div>
                        <div class="info-item">
                        <span class="info-key">몸무게</span>
                        <span class="info-value">${roomData.opponentWeight ?? 'N/A'}kg</span>
                        </div>
                        <div class="info-item">
                        <span class="info-key">체지방량</span>
                        <span class="info-value">${roomData.opponentBodyfat ?? 'N/A'}%</span>
                        </div>
                    `;
                    }
                    box.appendChild(infoDiv);

                // (3) 로그인 사용자와 비교해서 올바른 영역에 추가
                const me = localStorage.getItem('loggedInUser');
                if (data.uploader === me) {
                    myEl.appendChild(box);
                } else {
                    opponentEl.appendChild(box);
                }
            });

            // ── 상태 메시지 및 버튼 활성화 ──
            const count        = Object.keys(latestByUploader).length;
            const bothUploaded = (count >= 2);
            statusEl.innerText = bothUploaded
                ? '양쪽 영상이 모두 업로드되었습니다.'
                : '상대방 영상을 기다리는 중...';
            if (acceptBtn) acceptBtn.disabled = !bothUploaded;
            if (rejectBtn) rejectBtn.disabled = !bothUploaded;
        });

        // 4) 수락 버튼 클릭 시
        if (acceptBtn) {
            acceptBtn.addEventListener('click', async () => {
                const me = localStorage.getItem('loggedInUser');
                try {
                    await updateDoc(roomRef, { accepted: arrayUnion(me) });
                    const fresh = await getDoc(roomRef);
                    const d     = fresh.data();
                    const everyoneAccepted =
                        (d.accepted ?? []).length === d.participants.length;
                    if (everyoneAccepted && !d.startAt) {
                        await updateDoc(roomRef, { startAt: serverTimestamp() });
                    }
                    alert('수락되었습니다! 상대방을 기다리는 중…');
                    acceptBtn.disabled = true;
                } catch (e) {
                    console.error('수락 오류', e);
                    alert('수락 처리 중 오류가 발생했습니다.');
                }
            });
        }

        // 5) 재업로드 버튼 클릭 시
        const reuploadBtn = document.getElementById('reuploadBtn');
        if (reuploadBtn) {
            reuploadBtn.addEventListener('click', () => {
                window.location.href = `submit_results.html?roomId=${roomId}`;
            });
        }

        // 6) 거절 버튼 클릭 시
        if (rejectBtn) {
            rejectBtn.addEventListener('click', async () => {
                if (!confirm('내기를 취소하시겠습니까?')) return;
                try {
                    const uploader = localStorage.getItem('loggedInUser');
                    const myQ = query(subsRef, where('uploader', '==', uploader));
                    const mySnaps = await getDocs(myQ);
                    for (const snap of mySnaps.docs) {
                        const { storagePath } = snap.data();
                        if (storagePath) {
                            await deleteObject(storageRef(storage, storagePath));
                        }
                        await deleteDoc(snap.ref);
                    }
                    await updateDoc(doc(db, 'rooms', roomId), {
                        participants: arrayRemove(uploader)
                    });
                    alert('내기를 취소했습니다.');
                    window.location.href = 'main.html';
                } catch (e) {
                    console.error('취소 처리 오류', e);
                    alert('취소 처리 중 문제가 발생했습니다.');
                }
            });
        }
    }

// ---- endresults -----------
function setupEndResults() {
  const params = new URLSearchParams(location.search);
  const roomId = params.get('roomId');
  if (!roomId) { alert('잘못된 접근입니다.'); return; }

  const phone        = localStorage.getItem('loggedInUser');
  const fileInput    = document.getElementById('videoInput');
  const uploadArea   = document.getElementById('uploadArea');
  const previewVideo = document.getElementById('videoPreview');
  const fileNameEl   = document.getElementById('fileName');
  const removeBtn    = document.getElementById('removeVideoBtn');
  const submitBtn    = document.getElementById('submitendResultsBtn');

  /* 업로드 UI */
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    previewVideo.src            = URL.createObjectURL(f);
    previewVideo.style.display  = 'block';
    fileNameEl.textContent      = f.name;
    fileNameEl.style.display    = 'inline';
    removeBtn.style.display     = 'inline-block';
  });
  removeBtn.addEventListener('click', e => {
    e.stopPropagation();
    fileInput.value             = '';
    previewVideo.style.display  = 'none';
    previewVideo.src            = '';
    fileNameEl.style.display    = 'none';
    removeBtn.style.display     = 'none';
  });

  /* 전송 */
  submitBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) { alert('영상을 선택해주세요.'); return; }
    const file = fileInput.files[0];

    try {
      const path = `rooms/${roomId}/${phone}/endresults/${Date.now()}_${file.name}`;
      const ref  = storageRef(storage, path);
      await uploadBytes(ref, file);
      const url  = await getDownloadURL(ref);

      await addDoc(collection(db, 'rooms', roomId, 'endSubmissions'), {
        uploader: phone,
        fileName: file.name,
        url,
        contentType: file.type,
        storagePath: path,
        createdAt: serverTimestamp()
      });

      alert('24시간 이내에 결과가 결정됩니다.');
        location.href = 'main.html';
    } catch (e) {
      console.error(e);
      alert('업로드 중 오류가 발생했습니다.');
    }
  });
}

/* === (2) 현재 페이지에 맞는 초기화 호출 === */
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname.split('/').pop();

  if (page === 'submit_endresults.html') {
    setupEndResults();                 // ← end-results 전용
  } else if (page === 'submit_results.html') {
    setupSubmitResults();              // 이미 존재
  } else if (page === 'battle-screen.html') {
    setupBattleScreen();
  } else if (page === 'room-detail.html') {
    loadRoomDetail();
  } else if (page === 'main.html' || page === '') {
    loadRooms();
  }
});