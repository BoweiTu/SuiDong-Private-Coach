/* ==========================================================================
   随动私教 - 逻辑层 (app.js)
   集中管理：区块切换、训练计划生成、营养测算、AI问答交互
   依赖：data.js（gymExercises / homeExercises / foodDatabase /
         chatResponses / nutritionChatResponses）
   说明：函数均声明在全局作用域，供 index.html 内联事件 onclick 调用。
   ========================================================================== */

/* --------------------------------------------------------------------------
   通用工具
   -------------------------------------------------------------------------- */

/* 更新疲劳度滑块旁的数值显示 */
function updateFatigueValue(id, value) {
  document.getElementById('fatigue-' + id + '-val').textContent = value;
}

/* 顶部导航：切换训练 / 营养 区块 */
function showSection(section) {
  document.getElementById('training-section').classList.add('hidden');
  document.getElementById('nutrition-section').classList.add('hidden');
  document.getElementById(`${section}-section`).classList.remove('hidden');
}

/* --------------------------------------------------------------------------
   训练计划生成
   -------------------------------------------------------------------------- */

/* 根据疲劳度 / 时长 / 目标 / 强度 / 场地，生成本日训练方案 */
async function generateTraining() {
  const btn = document.getElementById('training-btn');
  const resultDiv = document.getElementById('training-result');

  btn.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;
  btn.disabled = true;

  await new Promise(resolve => setTimeout(resolve, 1500));

  const fatigueValues = {
    chest: parseInt(document.getElementById('fatigue-chest').value),
    shoulders: parseInt(document.getElementById('fatigue-shoulders').value),
    back: parseInt(document.getElementById('fatigue-back').value),
    legs: parseInt(document.getElementById('fatigue-legs').value),
    'arms-bicep': parseInt(document.getElementById('fatigue-arms-bicep').value),
    'arms-tricep': parseInt(document.getElementById('fatigue-arms-tricep').value)
  };

  const avgFatigue = Object.values(fatigueValues).reduce((a, b) => a + b, 0) / 6;
  const duration = parseInt(document.getElementById('duration').value);
  const goal = document.getElementById('goal').value;
  const intensity = document.getElementById('intensity').value;
  const location = document.getElementById('location').value;

  const exercises = location === 'gym' ? gymExercises : homeExercises;
  const isHighFatigue = avgFatigue >= 4;
  const isHighIntensity = intensity === 'high';
  const isExtremeIntensity = intensity === 'extreme';

  let exerciseCount = 4;
  if (duration < 30) exerciseCount = 3;
  else if (duration > 60) exerciseCount = 5;
  if (isHighFatigue) exerciseCount = Math.max(2, exerciseCount - 1);
  if (isHighIntensity) exerciseCount += 2;
  if (isExtremeIntensity) exerciseCount += 3;

  const workoutTemplates = [
    ['chest', 'shoulders', 'arms'],
    ['back', 'shoulders', 'arms'],
    ['legs', 'core'],
    ['chest', 'back', 'core'],
    ['shoulders', 'arms', 'core'],
    ['chest', 'legs', 'core'],
    ['back', 'legs', 'core']
  ];
  const template = workoutTemplates[Math.floor(Math.random() * workoutTemplates.length)];
  const selectedGroups = template.slice(0, exerciseCount);

  const weight = 60;
  const generatedExercises = [];

  selectedGroups.forEach((group, index) => {
    const groupExercises = exercises[group];
    let groupFatigue = fatigueValues[group] || fatigueValues['arms-bicep'];
    if (group === 'arms') {
      groupFatigue = (fatigueValues['arms-bicep'] + fatigueValues['arms-tricep']) / 2;
    }

    let exercisesPerGroup = 1;
    if (isExtremeIntensity && groupFatigue <= 3) exercisesPerGroup = 3;
    else if (isHighIntensity && groupFatigue <= 3) exercisesPerGroup = 2;

    for (let i = 0; i < exercisesPerGroup; i++) {
      const usedIndices = generatedExercises
        .filter(e => e.group === group)
        .map(e => e.exerciseIndex);

      let exerciseIndex;
      do {
        exerciseIndex = Math.floor(Math.random() * groupExercises.length);
      } while (usedIndices.includes(exerciseIndex));

      const exerciseName = groupExercises[exerciseIndex];

      let baseSets = 3;
      if (!isHighIntensity) {
        baseSets = groupFatigue >= 4 ? 3 : (groupFatigue >= 3 ? 4 : 4);
      }

      let baseReps = isHighIntensity ? 8 : (groupFatigue >= 4 ? 12 : (groupFatigue >= 3 ? 10 : 8));

      if (goal === 'muscle') baseReps = Math.max(6, baseReps - 2);
      else if (goal === 'fat_loss') baseReps = Math.min(15, baseReps + 2);

      generatedExercises.push({
        name: exerciseName,
        group: group,
        exerciseIndex: exerciseIndex,
        sets: baseSets,
        reps: baseReps,
        weight: exerciseName.includes('俯卧撑') || exerciseName.includes('自重') ? '自重' : `${Math.round(weight * (0.3 + (5 - groupFatigue) * 0.1))}kg`,
        rest: groupFatigue >= 4 ? 75 : (baseReps <= 8 ? 90 : 60)
      });
    }
  });

  const goalLabel = { muscle: '增肌', fat_loss: '减脂', shape: '塑形' }[goal];
  const fatigueLabel = avgFatigue >= 4 ? '高' : (avgFatigue >= 3 ? '中等' : '低');

  const intensityLabel = { low: '低', medium: '适中', high: '高强度', extreme: '魔鬼强度' }[intensity];

  resultDiv.innerHTML = `
    <div class="bg-gray-50 rounded-xl p-4 mb-4">
      <div class="flex gap-4 text-sm text-gray-600">
        <span><strong>目标:</strong> ${goalLabel}</span>
        <span><strong>时长:</strong> ${duration}分钟</span>
        <span><strong>强度:</strong> ${intensityLabel}</span>
        <span><strong>平均疲劳度:</strong> ${fatigueLabel}</span>
      </div>
    </div>
    <div class="space-y-3">
      ${generatedExercises.map((ex, i) => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div class="w-8 h-8 bg-[#FF6B35]/20 text-[#FF6B35] rounded-full flex items-center justify-center font-bold text-sm">${i + 1}</div>
          <div class="flex-1">
            <div class="font-medium text-gray-800">${ex.name}</div>
            <div class="text-sm text-gray-500">${ex.sets}组×${ex.reps}次 | ${ex.weight} | 休息${ex.rest}秒</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
      💡 ${isHighFatigue ? '今日疲劳度较高，建议降低训练强度，保证动作质量' : '注意肩部稳定，保持呼吸节奏'}
    </div>
    <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
      🧘 拉伸要点：${selectedGroups.map(g => ({ chest: '胸肌拉伸', back: '背部拉伸', shoulders: '肩部拉伸', arms: '手臂拉伸', legs: '腿部拉伸', core: '腹部拉伸' }[g])).join('、')}
    </div>
  `;

  btn.innerHTML = `<span>生成训练计划</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
  btn.disabled = false;
}

/* --------------------------------------------------------------------------
   营养测算
   -------------------------------------------------------------------------- */

/* 根据餐食描述匹配食物库，计算热量与三大营养素，并给出剩余补充建议 */
async function calculateNutrition() {
  const btn = document.getElementById('nutrition-btn');
  const resultDiv = document.getElementById('nutrition-result');

  btn.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;
  btn.disabled = true;

  await new Promise(resolve => setTimeout(resolve, 1500));

  const mealInput = document.getElementById('meal-input').value || '一碗米饭+鸡胸肉+青菜';
  const goal = document.getElementById('nutrition-goal').value;

  let calories = 0, protein = 0, carbs = 0, fat = 0;
  Object.keys(foodDatabase).forEach(food => {
    if (mealInput.includes(food)) {
      const data = foodDatabase[food];
      calories += data.calories;
      protein += data.protein;
      carbs += data.carbs;
      fat += data.fat;
    }
  });

  if (calories === 0) {
    calories = 520;
    protein = 42;
    carbs = 65;
    fat = 18;
  }

  const weight = 70;
  let targetProtein, targetCarbs, targetFat;

  if (goal === 'muscle') {
    targetProtein = 140;
    targetCarbs = 200;
    targetFat = 60;
  } else if (goal === 'fat_loss') {
    targetProtein = 120;
    targetCarbs = 180;
    targetFat = 50;
  } else {
    targetProtein = 130;
    targetCarbs = 190;
    targetFat = 55;
  }

  const mealType = document.getElementById('meal-type').value;
  let previousProtein = 0, previousCarbs = 0, previousFat = 0;

  if (mealType === 'lunch') {
    previousProtein = 30 + Math.floor(Math.random() * 10);
    previousCarbs = 50 + Math.floor(Math.random() * 20);
    previousFat = 15 + Math.floor(Math.random() * 5);
  } else if (mealType === 'dinner') {
    previousProtein = 60 + Math.floor(Math.random() * 20);
    previousCarbs = 100 + Math.floor(Math.random() * 30);
    previousFat = 25 + Math.floor(Math.random() * 10);
  } else if (mealType === 'snack') {
    previousProtein = 80 + Math.floor(Math.random() * 20);
    previousCarbs = 140 + Math.floor(Math.random() * 30);
    previousFat = 35 + Math.floor(Math.random() * 10);
  }

  const consumed = {
    protein: previousProtein + protein,
    carbs: previousCarbs + carbs,
    fat: previousFat + fat
  };

  const remaining = {
    protein: Math.max(0, targetProtein - consumed.protein),
    carbs: Math.max(0, targetCarbs - consumed.carbs),
    fat: Math.max(0, targetFat - consumed.fat)
  };

  const suggestions = {
    muscle: '建议晚餐多摄入鱼虾、粗粮补充蛋白质与复合碳水',
    fat_loss: '建议午餐增加优质蛋白质摄入，减少精制碳水',
    shape: '保持均衡饮食，注意蛋白质和膳食纤维摄入'
  };

  resultDiv.innerHTML = `
    <div class="bg-gray-50 rounded-xl p-4 mb-4">
      <div class="text-sm text-gray-600 mb-2">本次摄入：${calories} kcal</div>
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white p-2 rounded border border-red-200 text-center">
          <div class="text-xs text-gray-500">蛋白质</div>
          <div class="font-medium text-red-600">${Math.round(protein * 10) / 10}g</div>
        </div>
        <div class="bg-white p-2 rounded border border-blue-200 text-center">
          <div class="text-xs text-gray-500">碳水</div>
          <div class="font-medium text-blue-600">${Math.round(carbs * 10) / 10}g</div>
        </div>
        <div class="bg-white p-2 rounded border border-orange-200 text-center">
          <div class="text-xs text-gray-500">脂肪</div>
          <div class="font-medium text-orange-600">${Math.round(fat * 10) / 10}g</div>
        </div>
      </div>
    </div>
    <div class="bg-gray-50 rounded-xl p-4 mb-4">
      <div class="text-sm text-gray-600 mb-3">今日目标：蛋白${targetProtein}g、碳水${targetCarbs}g、脂肪${targetFat}g</div>
      <div class="text-sm text-gray-600 mb-3">今日已摄入：蛋白${Math.round(consumed.protein)}g、碳水${Math.round(consumed.carbs)}g、脂肪${Math.round(consumed.fat)}g</div>
      <div class="text-sm text-green-600 font-medium">剩余需补充：蛋白${Math.round(remaining.protein)}g、碳水${Math.round(remaining.carbs)}g、脂肪${Math.round(remaining.fat)}g</div>
    </div>
    <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
      💡 ${suggestions[goal]}
    </div>
  `;

  btn.innerHTML = `<span>测算营养</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
  btn.disabled = false;
}

/* --------------------------------------------------------------------------
   AI 问答交互
   -------------------------------------------------------------------------- */

/* 私教问答：关键词匹配知识库 */
function getChatResponse(question) {
  for (const keyword of Object.keys(chatResponses)) {
    if (question.includes(keyword)) {
      return chatResponses[keyword];
    }
  }
  return '我可以帮你解答健身相关的问题，比如动作姿势、训练技巧、营养建议等。你可以问得更具体一些，比如"卧推的正确姿势是什么？"';
}

/* 私教问答：发送消息并渲染对话气泡 */
async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('chat-btn');
  const messagesDiv = document.getElementById('chat-messages');
  const question = input.value.trim();

  if (!question) return;

  messagesDiv.innerHTML += `
    <div class="flex gap-3 justify-end">
      <div class="bg-[#FF6B35] text-white rounded-lg rounded-tr-none px-4 py-2">
        <p class="text-sm">${question}</p>
      </div>
      <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      </div>
    </div>
  `;

  input.value = '';
  btn.disabled = true;

  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = getChatResponse(question);

  messagesDiv.innerHTML += `
    <div class="flex gap-3">
      <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
        </svg>
      </div>
      <div class="bg-gray-100 rounded-lg rounded-tl-none px-4 py-2">
        <p class="text-sm text-gray-700">${response}</p>
      </div>
    </div>
  `;

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  btn.disabled = false;
}

/* 营养师问答：关键词匹配知识库 */
function getNutritionChatResponse(question) {
  for (const keyword of Object.keys(nutritionChatResponses)) {
    if (question.includes(keyword)) {
      return nutritionChatResponses[keyword];
    }
  }
  return '我可以帮你解答饮食搭配、营养摄入、食材选择等问题。你可以问得更具体一些，比如"增肌期早餐怎么吃？"或"减脂期晚餐推荐什么？"';
}

/* 营养师问答：发送消息并渲染对话气泡 */
async function sendNutritionChatMessage() {
  const input = document.getElementById('nutrition-chat-input');
  const btn = document.getElementById('nutrition-chat-btn');
  const messagesDiv = document.getElementById('nutrition-chat-messages');
  const question = input.value.trim();

  if (!question) return;

  messagesDiv.innerHTML += `
    <div class="flex gap-3 justify-end">
      <div class="bg-[#2EC4B6] text-white rounded-lg rounded-tr-none px-4 py-2">
        <p class="text-sm">${question}</p>
      </div>
      <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      </div>
    </div>
  `;

  input.value = '';
  btn.disabled = true;

  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = getNutritionChatResponse(question);

  messagesDiv.innerHTML += `
    <div class="flex gap-3">
      <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-[#2EC4B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      <div class="bg-gray-100 rounded-lg rounded-tl-none px-4 py-2">
        <p class="text-sm text-gray-700">${response}</p>
      </div>
    </div>
  `;

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  btn.disabled = false;
}
