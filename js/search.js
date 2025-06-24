// Urbindex - Search Module

function initSearch() {
  const spotsSearch = document.getElementById('spots-search');
  const forumSearch = document.getElementById('forum-search');
  
  if (spotsSearch) {
    spotsSearch.addEventListener('input', window.utilsModule.debounce(searchLocations, 300));
  }
  
  if (forumSearch) {
    forumSearch.addEventListener('input', window.utilsModule.debounce(searchForum, 300));
  }
}

async function searchLocations(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) return;
  
  if (!locationsRef) {
    console.error('Locations reference not available');
    return;
  }
  
  try {
    const snapshot = await locationsRef
      .orderBy('name')
      .startAt(query)
      .endAt(query + '\uf8ff')
      .limit(10)
      .get();
    
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    displaySearchResults(results, 'locations');
  } catch (error) {
    console.error('Search error:', error);
  }
}

async function searchForum(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) return;
  
  if (!db) {
    console.error('Database reference not available');
    return;
  }
  
  try {
    const snapshot = await db.collection('forum')
      .orderBy('title')
      .startAt(query)
      .endAt(query + '\uf8ff')
      .limit(10)
      .get();
    
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    displaySearchResults(results, 'forum');
  } catch (error) {
    console.error('Forum search error:', error);
  }
}

function displaySearchResults(results, type) {
  // Basic implementation - could be enhanced with proper UI
  console.log(`${type} search results:`, results);
}

window.searchModule = {
  initSearch
};