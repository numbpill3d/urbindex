// Test file for search, filter, and sort functionality
// This tests the core logic without requiring browser/DOM

class TestUrbindexApp {
    constructor() {
        this.allUserLocations = [
            { id: '1', data: { name: 'Abandoned Warehouse', description: 'Old factory building', category: 'abandoned', riskLevel: 'moderate', tags: ['factory', 'urban'], ratings: { user1: 4, user2: 5 }, createdAt: new Date('2024-01-01') } },
            { id: '2', data: { name: 'Rooftop View', description: 'Great city skyline', category: 'rooftop', riskLevel: 'low', tags: ['view', 'city'], ratings: { user1: 3 }, createdAt: new Date('2024-01-02') } },
            { id: '3', data: { name: 'Tunnel System', description: 'Underground passages', category: 'tunnel', riskLevel: 'high', tags: ['underground', 'historic'], ratings: { user1: 2, user2: 1, user3: 3 }, createdAt: new Date('2024-01-03') } },
            { id: '4', data: { name: 'Factory Ruins', description: 'Industrial complex', category: 'industrial', riskLevel: 'moderate', tags: ['factory', 'rust'], ratings: {}, createdAt: new Date('2024-01-04') } }
        ];
    }

    // Fuzzy matching function for better search results
    fuzzyMatch(text, searchTerm) {
        if (!searchTerm) return true;

        const textLower = text.toLowerCase();
        const termLower = searchTerm.toLowerCase();

        // Exact match
        if (textLower.includes(termLower)) return true;

        // Fuzzy matching - allow for typos and similar words
        const words = textLower.split(/\s+/);
        const termWords = termLower.split(/\s+/);

        return termWords.every(termWord => {
            return words.some(word => {
                // Allow 1 character difference for words longer than 3 characters
                if (word.length > 3 && termWord.length > 3) {
                    const diff = this.charDifference(word, termWord);
                    return diff <= 1;
                }
                return word.startsWith(termWord) || termWord.startsWith(word);
            });
        });
    }

    // Calculate character difference between two strings
    charDifference(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const maxLen = Math.max(len1, len2);

        if (maxLen === 0) return 0;

        let differences = 0;
        const minLen = Math.min(len1, len2);

        for (let i = 0; i < minLen; i++) {
            if (str1[i] !== str2[i]) differences++;
        }

        differences += Math.abs(len1 - len2);
        return differences;
    }

    // Get location rating score for sorting
    getLocationScore(locationData) {
        const ratings = locationData.ratings || {};
        const values = Object.values(ratings);
        if (values.length === 0) return 0;

        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / values.length;
    }

    // Sort locations based on selected criteria
    sortLocations(locations, sortBy) {
        switch (sortBy) {
            case 'name':
                return locations.sort((a, b) => a.data.name.localeCompare(b.data.name));
            case 'popularity':
                return locations.sort((a, b) => {
                    const scoreA = this.getLocationScore(a.data);
                    const scoreB = this.getLocationScore(b.data);
                    return scoreB - scoreA; // Higher score first
                });
            case 'risk-low':
                const riskOrder = { 'low': 1, 'moderate': 2, 'high': 3 };
                return locations.sort((a, b) => {
                    const riskA = riskOrder[a.data.riskLevel] || 999;
                    const riskB = riskOrder[b.data.riskLevel] || 999;
                    return riskA - riskB;
                });
            case 'risk-high':
                const riskOrderDesc = { 'high': 1, 'moderate': 2, 'low': 3 };
                return locations.sort((a, b) => {
                    const riskA = riskOrderDesc[a.data.riskLevel] || 999;
                    const riskB = riskOrderDesc[b.data.riskLevel] || 999;
                    return riskA - riskB;
                });
            case 'recent':
            default:
                return locations.sort((a, b) => {
                    const timeA = a.data.createdAt?.toDate ? a.data.createdAt.toDate() : new Date(a.data.createdAt || 0);
                    const timeB = b.data.createdAt?.toDate ? b.data.createdAt.toDate() : new Date(b.data.createdAt || 0);
                    return timeB - timeA; // Newest first
                });
        }
    }

    // Test the filtering and sorting logic
    testFiltering(searchTerm = '', categoryFilter = '', riskFilter = '', sortBy = 'recent') {
        let filteredLocations = this.allUserLocations.filter(({ data }) => {
            // Enhanced search filter with fuzzy matching and tags support
            const matchesSearch = !searchTerm || this.fuzzyMatch(
                [data.name, data.description, data.category, ...(data.tags || [])].join(' '),
                searchTerm
            );

            // Category filter
            const matchesCategory = !categoryFilter || data.category === categoryFilter;

            // Risk filter
            const matchesRisk = !riskFilter || data.riskLevel === riskFilter;

            return matchesSearch && matchesCategory && matchesRisk;
        });

        // Apply sorting
        filteredLocations = this.sortLocations(filteredLocations, sortBy);

        return filteredLocations.map(({ id, data }) => ({ id, name: data.name, category: data.category, riskLevel: data.riskLevel, score: this.getLocationScore(data) }));
    }
}

// Test cases
function runTests() {
    const app = new TestUrbindexApp();
    const tests = [];

    // Test 1: Basic filtering
    console.log('Test 1: Basic filtering (no filters)');
    const result1 = app.testFiltering();
    tests.push(result1.length === 4 && result1[0].name === 'Factory Ruins'); // Should be sorted by recent (newest first)

    // Test 2: Search by name
    console.log('Test 2: Search by name (warehouse)');
    const result2 = app.testFiltering('warehouse');
    tests.push(result2.length === 1 && result2[0].name === 'Abandoned Warehouse');

    // Test 3: Search by tags
    console.log('Test 3: Search by tags (factory)');
    const result3 = app.testFiltering('factory');
    tests.push(result3.length === 2 && result3.every(loc => loc.name.includes('Factory') || loc.name.includes('Abandoned')));

    // Test 4: Fuzzy matching
    console.log('Test 4: Fuzzy matching (warehous)');
    const result4 = app.testFiltering('warehous');
    tests.push(result4.length === 1 && result4[0].name === 'Abandoned Warehouse');

    // Test 5: Category filter
    console.log('Test 5: Category filter (abandoned)');
    const result5 = app.testFiltering('', 'abandoned');
    tests.push(result5.length === 1 && result5[0].category === 'abandoned');

    // Test 6: Risk filter
    console.log('Test 6: Risk filter (low)');
    const result6 = app.testFiltering('', '', 'low');
    tests.push(result6.length === 1 && result6[0].riskLevel === 'low');

    // Test 7: Sort by name
    console.log('Test 7: Sort by name');
    const result7 = app.testFiltering('', '', '', 'name');
    tests.push(result7.length === 4 && result7[0].name === 'Abandoned Warehouse');

    // Test 8: Sort by popularity
    console.log('Test 8: Sort by popularity');
    const result8 = app.testFiltering('', '', '', 'popularity');
    tests.push(result8.length === 4 && result8[0].score === 4.5); // Warehouse has highest average rating

    // Test 9: Sort by risk level (low to high)
    console.log('Test 9: Sort by risk level (low to high)');
    const result9 = app.testFiltering('', '', '', 'risk-low');
    tests.push(result9.length === 4 && result9[0].riskLevel === 'low' && result9[3].riskLevel === 'high');

    // Test 10: Sort by risk level (high to low)
    console.log('Test 10: Sort by risk level (high to low)');
    const result10 = app.testFiltering('', '', '', 'risk-high');
    tests.push(result10.length === 4 && result10[0].riskLevel === 'high' && result10[3].riskLevel === 'low');

    // Test 11: Combined filters
    console.log('Test 11: Combined search and filter');
    const result11 = app.testFiltering('factory', '', 'moderate');
    tests.push(result11.length === 1 && result11[0].name === 'Factory Ruins');

    const passed = tests.filter(Boolean).length;
    const total = tests.length;

    console.log(`\nTest Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('✅ All tests passed!');
        return true;
    } else {
        console.log('❌ Some tests failed');
        return false;
    }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestUrbindexApp, runTests };
} else if (typeof window === 'undefined') {
    // Node.js environment
    runTests();
}