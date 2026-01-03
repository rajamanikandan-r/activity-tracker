/**
 * Analytics module for Daily Activity Tracker
 * Handles streak calculations and other analytics
 */

const Analytics = (() => {
    /**
     * Calculate the current streak for a good habit action
     * A streak is consecutive days with the action performed
     * @param {String} actionId - ID of the action to calculate streak for
     * @returns {Number} Number of consecutive days with the action
     */
    const calculateActionStreak = (actionId) => {
        const activities = Storage.getActivities();
        if (activities.length === 0) return 0;
        
        // Get all unique dates with this action using date
        const actionDates = [...new Set(
            activities
                .filter(activity => activity.actionId === actionId || 
                       (activity.type === 'exercise' && actionId === 'exercise'))
                .filter(activity => activity.date) // Only use activities with date
                .map(activity => activity.date)
        )].sort();
        
        if (actionDates.length === 0) return 0;
        
        // Get today's date in local timezone YYYY-MM-DD format
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        // Check if action was done today
        const actionTodayIndex = actionDates.indexOf(today);
        const lastActionDate = actionDates.length > 0 ? actionDates[actionDates.length - 1] : null;
        
        // If no action today, check if action was done yesterday
        if (actionTodayIndex === -1) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayYear = yesterday.getFullYear();
            const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
            const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
            const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
            
            if (lastActionDate !== yesterdayStr) {
                return 0; // Streak broken if no action yesterday and today
            }
        }
        
        // Count consecutive days
        let streak = 1;
        for (let i = actionDates.length - 1; i > 0; i--) {
            const currentDate = new Date(actionDates[i]);
            const prevDate = new Date(actionDates[i - 1]);
            
            // Calculate difference in days
            const diffTime = currentDate - prevDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    };
    
    /**
     * Calculate days since the last occurrence of a bad habit
     * @param {String} actionId - ID of the bad habit action
     * @returns {Number} Number of days since last occurrence
     */
    const calculateDaysSinceLastOccurrence = (actionId) => {
        const activities = Storage.getActivities();
        
        // Filter activities for this action that have date
        const relevantActivities = activities
            .filter(activity => activity.actionId === actionId)
                    //   (activity.type === 'diet' && 
                    //    activity.foodQuality === 'unhealthy' && 
                    //    actionId === 'diet-unhealthy'))
            .filter(activity => activity.date);
        
        if (relevantActivities.length === 0) return 0;
        
        // Sort by timestamp (most recent first)
        relevantActivities.sort((a, b) => b.timestamp - a.timestamp);
        
        // Get the most recent date
        const lastDate = new Date(relevantActivities[0].date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate the difference in days
        const diffTime = today - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    };
    
    /**
     * Get all good habit actions
     * @returns {Array} Array of good habit actions
     */
    const getGoodHabitActions = () => {
        const actions = Storage.getActions();
        return actions.filter(action => action.type === 'good');
    };
    
    /**
     * Get all bad habit actions
     * @returns {Array} Array of bad habit actions
     */
    const getBadHabitActions = () => {
        const actions = Storage.getActions();
        return actions.filter(action => action.type === 'bad');
    };
    
    /**
     * Calculate exercise streak (for backward compatibility)
     * @returns {Number} Number of consecutive days with exercise
     */
    const calculateExerciseStreak = () => {
        return calculateActionStreak('exercise');
    };
    
    /**
     * Calculate days since last unhealthy food (for backward compatibility)
     * @returns {Number} Number of days since last unhealthy food entry
     */
    const calculateDaysSinceUnhealthyFood = () => {
        return calculateDaysSinceLastOccurrence('diet-unhealthy');
    };
    
    /**
     * Calculate average work hours per day
     * @returns {Number} Average work hours per day
     */
    const calculateAverageWorkHours = () => {
        const activities = Storage.getActivities();
        const workActivities = activities.filter(activity => 
            activity.actionId === 'work' || activity.type === 'work');
        
        if (workActivities.length === 0) return 0;
        
        let totalHours = 0;
        
        workActivities.forEach(activity => {
            const startTime = activity.startTime.split(':');
            const endTime = activity.endTime.split(':');
            
            const startDate = new Date(0);
            startDate.setHours(parseInt(startTime[0]), parseInt(startTime[1]), 0);
            
            const endDate = new Date(0);
            endDate.setHours(parseInt(endTime[0]), parseInt(endTime[1]), 0);
            
            // Handle end time being next day
            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }
            
            const diffHours = (endDate - startDate) / (1000 * 60 * 60);
            totalHours += diffHours;
        });
        
        return (totalHours / workActivities.length).toFixed(1);
    };
    
        /**
     * Count activities by action for the last 30 days
     * @returns {Object} Object with actionId as keys and counts as values
     */
    const getActivityCountsLast30Days = () => {
        const activities = Storage.getActivities();
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        // Filter activities from last 30 days
        const recentActivities = activities.filter(activity => {
            if (!activity.date) return false;
            const activityDate = new Date(activity.date);
            return activityDate >= thirtyDaysAgo && activityDate <= now;
        });
        
        // Group and count by actionId
        const counts = {};
        recentActivities.forEach(activity => {
            const actionId = activity.actionId || activity.type; // Fallback for legacy activities
            counts[actionId] = (counts[actionId] || 0) + 1;
        });
        
        return counts;
    };
    
    // Public API
    return {
        calculateActionStreak,
        calculateDaysSinceLastOccurrence,
        getGoodHabitActions,
        getBadHabitActions,
        calculateExerciseStreak,
        calculateDaysSinceUnhealthyFood,
        calculateAverageWorkHours,
        getActivityCountsLast30Days
    };
})();
