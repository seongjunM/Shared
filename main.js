// Basic client-side navigation and form handling

document.addEventListener('DOMContentLoaded', () => {
    // --- Point Management in localStorage ---
    function getPoints() {
        return parseInt(localStorage.getItem('userPoints') || '0', 10);
    }

    function setPoints(points) {
        localStorage.setItem('userPoints', points);
    }

    // --- Login Page (index.html) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // In a real application, authenticate user on the server
            // For this example, simply navigate to the main page
            window.location.href = 'main.html';
        });
    }

    // --- Signup Page (signup.html) ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // In a real application, register user on the server
            // For this example, alert and navigate to login
            alert('Sign up successful! Please log in.');
            window.location.href = 'index.html';
        });
    }

    // --- Main Page (main.html) ---
    const createRoomButton = document.getElementById('create-room-button');
    const currentPointsSpan = document.getElementById('current-points');

    if (createRoomButton) {
        createRoomButton.addEventListener('click', () => {
            window.location.href = 'create-room.html';
        });

        // Display current points on main page
        if (currentPointsSpan) {
            currentPointsSpan.textContent = `현재 Point: ${getPoints()}Pt`;
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
        createRoomForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const height = document.getElementById('user-height').value;
            const weight = document.getElementById('user-weight').value;
            const bodyfat = document.getElementById('user-bodyfat').value;
            const goal = document.getElementById('room-goal').value;
            const betting = document.getElementById('room-betting').value;
            const duration = document.getElementById('room-duration').value;

            const newRoom = {
                height: height,
                weight: weight,
                bodyfat: bodyfat,
                goal: goal,
                betting: betting,
                duration: duration
            };

            saveRoom(newRoom);
            console.log('Room saved to localStorage:', newRoom); // Log saved data
            alert('방이 성공적으로 생성되었습니다!');
            window.location.href = 'main.html'; // Redirect back to main page
        });
    }

    // --- Point Management Page (points.html) ---
    const currentPointsDisplay = document.getElementById('current-points-display');
    const chargeButton = document.getElementById('charge-button');
    const refundButton = document.getElementById('refund-button');

    if (currentPointsDisplay) {
        currentPointsDisplay.textContent = `${getPoints()} pt`;
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
        processChargeButton.addEventListener('click', () => {
            const amount = parseInt(chargeAmountInput.value, 10);
            if (!isNaN(amount) && amount > 0) {
                setPoints(getPoints() + amount);
                alert(`${amount} pt가 충전되었습니다.`);
                window.location.href = 'points.html';
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
     const processRefundButton = document.getElementById('process-refund');
     const cancelRefundButton = document.getElementById('cancel-refund');

     if (processRefundButton) {
         processRefundButton.addEventListener('click', () => {
             const amount = parseInt(refundAmountInput.value, 10);
             const currentPoints = getPoints();
             if (!isNaN(amount) && amount > 0) {
                 if (currentPoints >= amount) {
                     setPoints(currentPoints - amount);
                     alert(`${amount} pt가 환급되었습니다.`);
                     window.location.href = 'points.html';
                 } else {
                     alert('보유 포인트가 부족합니다.');
                 }
             } else {
                 alert('유효한 금액을 입력해주세요.');
             }
         });
     }

     if (cancelRefundButton) {
          cancelRefundButton.addEventListener('click', () => {
              window.location.href = 'points.html';
          });
     }

     // --- Room Detail Page (room-detail.html) ---
    if (document.querySelector('.opponent-info-section')) { // Check for an element specific to room-detail
        console.log('Room detail page loaded. Attempting to load room data.');
        loadRoomDetail();
    }

    function loadRoomDetail() {
        const room = JSON.parse(localStorage.getItem('currentRoom'));
        console.log('Room data loaded from localStorage:', room);

        if (room) {
            try {
                // Populate opponent info
                const detailWeightElement = document.getElementById('detail-weight');
                const detailHeightElement = document.getElementById('detail-height');
                const detailBodyfatElement = document.getElementById('detail-bodyfat');

                if(detailWeightElement) detailWeightElement.textContent = (room.weight || 'N/A') + 'kg';
                if(detailHeightElement) detailHeightElement.textContent = (room.height || 'N/A') + 'cm';
                if(detailBodyfatElement) detailBodyfatElement.textContent = (room.bodyfat || 'N/A') + '%';

                console.log('Opponent info elements populated.', {weight: detailWeightElement ? detailWeightElement.textContent : 'N/A', height: detailHeightElement ? detailHeightElement.textContent : 'N/A', bodyfat: detailBodyfatElement ? detailBodyfatElement.textContent : 'N/A'});

                // Populate goal setting info
                const detailGoalReductionElement = document.getElementById('detail-goal-reduction');
                const detailDurationElement = document.getElementById('detail-duration');
                const detailBettingElement = document.getElementById('detail-betting');

                // Calculate and display goal reduction
                let goalReduction = '';
                const goalParts = room.goal ? String(room.goal).split(',').map(part => part.trim()) : []; // Ensure room.goal is treated as string
                if (goalParts.length === 2 && !isNaN(parseFloat(goalParts[0])) && !isNaN(parseFloat(goalParts[1]))) {
                    const startGoal = parseFloat(goalParts[0]);
                    const endGoal = parseFloat(goalParts[1]);
                    const reduction = startGoal - endGoal;
                    goalReduction = `${reduction.toFixed(1)}%p`; // Format to one decimal place
                     console.log('Calculated goal reduction:', goalReduction);
                } else {
                     goalReduction = room.goal || 'N/A'; // Display raw input or N/A if format is unexpected
                     console.log('Goal format unexpected, displaying raw goal:', goalReduction);
                }

                 if(detailGoalReductionElement) detailGoalReductionElement.textContent = goalReduction;
                 if(detailDurationElement) detailDurationElement.textContent = (room.duration || 'N/A') + '개월';
                 if(detailBettingElement) detailBettingElement.textContent = (room.betting || 'N/A') + 'pt';

                 console.log('Goal setting elements populated.', {goalReduction: detailGoalReductionElement ? detailGoalReductionElement.textContent : 'N/A', duration: detailDurationElement ? detailDurationElement.textContent : 'N/A', betting: detailBettingElement ? detailBettingElement.textContent : 'N/A'});

                 console.log('Room details population attempt finished.');

            } catch (e) {
                console.error('Error populating room details:', e);
                alert('방 상세 정보를 불러오는데 실패했습니다.');
                // Optionally redirect back to main page
                // window.location.href = 'main.html';
            }
        } else {
            // Handle case where no room data is found (e.g., redirect back to main)
            console.error('No room data found in localStorage.');
            alert('방 정보를 찾을 수 없습니다.');
            window.location.href = 'main.html';
        }
    }

    // --- Helper functions for localStorage ---
    function saveRoom(room) {
        const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
        rooms.push(room);
        localStorage.setItem('rooms', JSON.stringify(rooms));
    }

    function loadRooms() {
        const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
        const roomListDiv = document.querySelector('.room-list');
        if (roomListDiv) {
            roomListDiv.innerHTML = ''; // Clear existing rooms
            rooms.forEach(room => {
                displayRoom(room, roomListDiv);
            });
        }
    }

    function displayRoom(room, containerElement) {
        const roomElement = document.createElement('div');
        roomElement.classList.add('room-item');

        // Format the goal string for main page display
        let formattedGoal = room.goal;
         const goalParts = room.goal ? String(room.goal).split(',').map(part => part.trim()) : []; // Ensure room.goal is treated as string
        if (goalParts.length === 2 && !isNaN(goalParts[0]) && !isNaN(goalParts[1])) {
            formattedGoal = `목표 : 체지방 ${goalParts[0]}% → ${goalParts[1]}%`;
        } else {
            formattedGoal = `목표 : ${room.goal}`;
        }

        // Displaying formatted Goal, Betting Amount, and Duration
        roomElement.innerHTML = `
            <h3>${formattedGoal}</h3>
            <p>💰 ${room.betting} | ⏰ ${room.duration}</p>
            <button class="join-room-button">입장하기</button>
        `;

        const joinButton = roomElement.querySelector('.join-room-button');
        joinButton.addEventListener('click', () => {
            // Save the current room details to localStorage before navigating
            localStorage.setItem('currentRoom', JSON.stringify(room));
            console.log('Saving current room to localStorage:', room);
            window.location.href = 'room-detail.html';
        });

        containerElement.appendChild(roomElement);
    }
});
