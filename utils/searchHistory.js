export class SearchHistory {
    constructor(maxItems = 10) {
        this.maxItems = maxItems;
    }

    addSearch(query, type) {
        let history = this.getHistory();
        history.unshift({ query, type, timestamp: Date.now() });
        history = history.slice(0, this.maxItems);
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('searchHistory')) || [];
        } catch {
            return [];
        }
    }

    clearHistory() {
        localStorage.removeItem('searchHistory');
    }
}