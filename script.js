document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const taskInput = document.getElementById('task-input');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const tasksRemaining = document.getElementById('tasks-remaining');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const themeToggle = document.querySelector('.theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const smartPanel = document.querySelector('.smart-panel-content');

  // State
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  let currentFilter = 'all';
  let suggestionTimeout; // For debouncing smart suggestions

  // Initialize
  renderTasks();
  updateStats();
  checkEmptyState(); // Initial check for empty state
  setupTheme();

  // Event Listeners
  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
  clearCompletedBtn.addEventListener('click', clearCompletedTasks);
  themeToggle.addEventListener('click', toggleTheme);

  // Debounced event listener for smart suggestions
  taskInput.addEventListener('input', () => {
    clearTimeout(suggestionTimeout);
    suggestionTimeout = setTimeout(handleSmartSuggestions, 300); // Wait 300ms after last input
  });

  // Filter tasks event listeners
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter;
      renderTasks(); // Re-render tasks based on new filter
      // The renderTasks function will now correctly call checkEmptyState
    });
  });

  // Functions
  function addTask() {
    const text = taskInput.value.trim();
    if (text === '') return;

    const newTask = {
      id: Date.now(),
      text,
      completed: false,
      priority: false,
      createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks(); // Re-render all tasks, applying current filter
    updateStats();
    checkEmptyState(); // Ensure empty state is updated after adding task
    taskInput.value = '';
    smartPanel.innerHTML = '<p>Start typing to get AI-powered suggestions</p>'; // Clear suggestions
  }

  function renderTasks() {
    taskList.innerHTML = ''; // Clear existing tasks

    const filteredTasks = tasks.filter(task => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'completed') return task.completed;
      if (currentFilter === 'priority') return task.priority;
      return true; // Should not be reached if filters are well-defined
    });

    // Check empty state *before* attempting to render tasks
    // This ensures the empty message appears if a filter yields no tasks
    if (filteredTasks.length === 0) {
      checkEmptyState(); // Now correctly handles empty filtered lists
      return; // No tasks to render for this filter
    }

    filteredTasks.forEach(task => {
      const taskItem = document.createElement('li');
      taskItem.className = 'task-item';
      taskItem.dataset.id = task.id;

      taskItem.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task as complete">
        <span class="task-text">${task.text}</span>
        <div class="task-actions">
          <button class="task-btn priority" title="Toggle Priority" aria-label="Toggle task priority">
            <i class="fas ${task.priority ? 'fa-solid' : 'fa-regular'} fa-star"></i>
          </button>
          <button class="task-btn delete" title="Delete Task" aria-label="Delete task">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      const checkbox = taskItem.querySelector('.task-checkbox');
      const priorityBtn = taskItem.querySelector('.priority');
      const deleteBtn = taskItem.querySelector('.delete');

      checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
      priorityBtn.addEventListener('click', () => toggleTaskPriority(task.id));
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      taskList.appendChild(taskItem);
    });

    // We no longer need an extra checkEmptyState here as it's handled at the beginning
    // if (filteredTasks.length === 0) { ... }
  }

  function toggleTaskComplete(id) {
    function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // If the task is being completed (not uncompleted) AND current filter is 'active'
    // or if the task is being uncompleted (not completed) AND current filter is 'completed'
    // then we want to animate it out.
    const shouldAnimateOut =
      (task.completed === false && currentFilter === 'active') || // Task goes from active to completed while active filter is on
      (task.completed === true && currentFilter === 'completed'); // Task goes from completed to active while completed filter is on


    if (shouldAnimateOut) {
      const taskItem = taskList.querySelector(`[data-id="${id}"]`);
      if (taskItem) {
        taskItem.classList.add('removing');
        taskItem.addEventListener('animationend', () => {
          
    tasks = tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    renderTasks(); // Re-render to reflect checked state and potential filtering changes
    updateStats();
          }, { once: true });
      }
    } else {
      // If no animation is needed (e.g., completing a task while in 'all' filter, or uncompleting)
      tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      saveTasks();
      renderTasks(); // Re-render immediately
      updateStats();
    }
  }
  }

  function toggleTaskPriority(id) {
    tasks = tasks.map(task =>
      task.id === id ? { ...task, priority: !task.priority } : task
    );
    saveTasks();
    renderTasks(); // Re-render to reflect priority icon change and potential filtering changes
  }

  function deleteTask(id) {
    const taskItem = taskList.querySelector(`[data-id="${id}"]`);
    if (taskItem) {
      taskItem.classList.add('removing'); // Add the removing class

      // Wait for the animation to complete before actually deleting
      taskItem.addEventListener('animationend', () => {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks(); // Re-render to remove task and apply current filter
    updateStats();
    }, { once: true }); // Use { once: true } to remove the event listener after it fires
    }
  }

  function clearCompletedTasks() {
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    renderTasks(); // Re-render to show only active tasks
    updateStats();
    // checkEmptyState is now correctly handled by renderTasks() when it's called
  }

  function updateStats() {
    const activeTasks = tasks.filter(task => !task.completed).length;
    tasksRemaining.textContent = `${activeTasks} ${activeTasks === 1 ? 'task' : 'tasks'} remaining`;
  }

  function checkEmptyState() {
    const filteredTasks = tasks.filter(task => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'completed') return task.completed;
      if (currentFilter === 'priority') return task.priority;
      return true;
    });

    // Display empty state if NO tasks are present in the *current filtered view*
    emptyState.style.display = filteredTasks.length === 0 ? 'block' : 'none';

    // Optional: Could add logic here to change empty state message
    // if tasks.length > 0 but filteredTasks.length === 0
    // e.g., "No active tasks found for this filter."
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

    // Corrected handleSmartSuggestions to simulate async API call
  async function handleSmartSuggestions() { // Added 'async' keyword
    const text = taskInput.value.trim();
    if (text.length < 2) {
      smartPanel.innerHTML = '<p>Start typing to get AI-powered suggestions</p>';
      return;
    }

    // Display a loading message while waiting for suggestions
    smartPanel.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Getting smart suggestions...</p>';

    try {
      // --- START OF MOCK API CALL SIMULATION ---
      // In a real app, you would replace this with an actual 'fetch' request to your backend or directly to an AI API (with caution).
      // Example of what a real fetch call might look like (DO NOT expose API_KEY directly in frontend):
      /*
      const API_KEY = "YOUR_AI_API_KEY"; // Highly discouraged in frontend for real APIs!
      const response = await fetch('https://api.some-ai-model.com/suggestions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}` // Or other authentication
          },
          body: JSON.stringify({ prompt: text })
      });

      if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
      }
      const data = await response.json();
      // Process 'data' to get your suggestions
      const aiSuggestions = processAiApiResponse(data); // You'd write this function
      */

      // For now, we'll simulate the delay and use your existing mock data structure
      const mockSuggestions = await new Promise(resolve => {
        setTimeout(() => {
          // Your existing generateSmartSuggestions logic
          const baseSuggestions = [
            {
              type: 'similar',
              tasks: tasks
                .filter(task => task.text.toLowerCase().includes(text.toLowerCase()))
                .slice(0, 3) // Limit to 3 similar tasks
            },
            {
              type: 'category',
              suggestion: `Add to "${text.split(' ')[0]}" category`
            },
            {
              type: 'reminder',
              suggestion: `Set reminder for this task`
            },
            {
              type: 'delegate',
              suggestion: `Delegate "${text}" to someone`
            }
          ];
          resolve(baseSuggestions.filter(suggestion =>
            suggestion.type === 'similar' ? suggestion.tasks.length > 0 : true
          ));
        }, 800); // Simulate network delay of 800ms
      });
      // --- END OF MOCK API CALL SIMULATION ---

      displaySuggestions(mockSuggestions);

    } catch (error) {
      console.error('Error fetching smart suggestions:', error);
      smartPanel.innerHTML = '<p class="error-message"><i class="fas fa-exclamation-triangle"></i> Failed to get suggestions. Please try again.</p>';
    }
  }

  function generateSmartSuggestions(text) {
    // This function will remain as a helper if you want to keep the logic for generating
    // the mock suggestions separate, as I've used it within the Promise above.
    // However, if you plan to completely replace it with an API call, you might eventually
    // remove this function and just have the API call logic directly in handleSmartSuggestions.
    // For now, it's fine.
    const mockSuggestions = [
      {
        type: 'similar',
        tasks: tasks
          .filter(task => task.text.toLowerCase().includes(text.toLowerCase()))
          .slice(0, 3) // Limit to 3 similar tasks
      },
      {
        type: 'category',
        suggestion: `Add to "${text.split(' ')[0]}" category`
      },
      { // CORRECTED: This was just 'reminder', now it's a full object
        type: 'reminder',
        suggestion: `Set reminder for this task`
      },
      {
        type: 'delegate',
        suggestion: `Delegate "${text}" to someone`
      }
    ];

    // Filter out 'similar' suggestion if no similar tasks are found
    return mockSuggestions.filter(suggestion =>
      suggestion.type === 'similar' ? suggestion.tasks.length > 0 : true
    );
  }

  function displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
      smartPanel.innerHTML = '<p>No specific suggestions found</p>'; // More specific message
      return;
    }

    let html = '';

    suggestions.forEach(suggestion => {
      if (suggestion.type === 'similar' && suggestion.tasks.length > 0) {
        html += `<div class="suggestion-group">
          <p class="suggestion-title">Similar tasks:</p>
          <ul class="suggestion-list">`;

        suggestion.tasks.forEach(task => {
          html += `<li class="suggestion-item" data-id="${task.id}" tabindex="0" role="button" aria-label="Load task: ${task.text}">
            <i class="fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
            ${task.text}
          </li>`;
        });

        html += `</ul></div>`;
      } else {
        html += `<div class="suggestion-item" data-type="${suggestion.type}" tabindex="0" role="button" aria-label="${suggestion.suggestion}">
          <i class="fas ${getSuggestionIcon(suggestion.type)}"></i>
          ${suggestion.suggestion}
        </div>`;
      }
    });

    smartPanel.innerHTML = html;

    // Add event listeners to newly rendered suggestion items
    document.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.id) {
          // Load similar task into input
          const task = tasks.find(t => t.id === parseInt(item.dataset.id));
          if (task) {
            taskInput.value = task.text;
            taskInput.focus();
            smartPanel.innerHTML = '<p>Start typing to get AI-powered suggestions</p>'; // Clear suggestions after selection
          }
        } else {
          // Handle other suggestion types (category, reminder, delegate)
          handleSuggestionAction(item.dataset.type);
        }
      });
      // Allow keyboard navigation for accessibility
      item.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent default scroll behavior for spacebar
          item.click();
        }
      });
    });
  }

  function getSuggestionIcon(type) {
    const icons = {
      'category': 'fa-tag',
      'reminder': 'fa-bell',
      'delegate': 'fa-user-plus'
    };
    return icons[type] || 'fa-lightbulb'; // Default icon
  }

  function handleSuggestionAction(type) {
    // In a real app, you would implement these actions with actual logic.
    // For now, we'll just update the smart panel with a confirmation message.
    const text = taskInput.value.trim();
    let message = '';

    switch(type) {
      case 'category':
        // Logic to categorize the task would go here
        message = `Task "${text}" is now categorized.`;
        break;
      case 'reminder':
        // Logic to set a reminder would go here (e.g., open a modal)
        message = `Reminder set for task "${text}"!`;
        break;
      case 'delegate':
        // Logic to delegate the task would go here
        message = `Task "${text}" has been delegated.`;
        break;
      default:
        message = `Action for "${text}" completed!`;
    }

    smartPanel.innerHTML = `<p>${message}</p>`;
    // Optionally, clear the input or add the task after certain actions
    // taskInput.value = '';
    // addTask(); // If 'category' action implies adding the task immediately
  }
});
