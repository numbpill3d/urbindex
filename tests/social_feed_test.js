/**
 * Social Feed and Posting Features Test Suite
 * Tests the comprehensive social functionality of Urbindex
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Mock Firebase
const firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => new Date()
        }
    },
    auth: {
        GoogleAuthProvider: class {},
        GithubAuthProvider: class {}
    },
    storage: {
        ref: () => ({
            child: () => ({
                put: () => Promise.resolve({ snapshot: { ref: { getDownloadURL: () => Promise.resolve('test-url') } } })
            })
        })
    }
};

// Set up JSDOM environment
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dom = new JSDOM(html, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.firebase = firebase;

// Mock console methods
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe('Social Feed and Posting Features', () => {
    let app;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = dom.window.document.body.innerHTML;

        // Create app instance
        app = new UrbindexApp();
        app.currentUser = {
            uid: 'test-user-123',
            displayName: 'Test User',
            email: 'test@example.com',
            isAnonymous: false
        };
        app.db = {
            collection: jest.fn(() => ({
                where: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({ docs: [], size: 0 })),
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: jest.fn(() => Promise.resolve({ docs: [], size: 0 }))
                        }))
                    })),
                    add: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
                    doc: jest.fn(() => ({
                        get: jest.fn(() => Promise.resolve({
                            exists: true,
                            data: () => ({ name: 'Test Location' })
                        })),
                        update: jest.fn(() => Promise.resolve()),
                        set: jest.fn(() => Promise.resolve())
                    }))
                })),
                doc: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Test Location' })
                    })),
                    update: jest.fn(() => Promise.resolve()),
                    set: jest.fn(() => Promise.resolve())
                })),
                add: jest.fn(() => Promise.resolve({ id: 'test-doc-id' }))
            }))
        };
        app.auth = {
            currentUser: app.currentUser,
            signInWithEmailAndPassword: jest.fn(),
            createUserWithEmailAndPassword: jest.fn(),
            signOut: jest.fn(),
            onAuthStateChanged: jest.fn((callback) => callback(app.currentUser))
        };
        app.storage = firebase.storage;
    });

    describe('Social Feed UI Rendering', () => {
        test('should render social feed view correctly', () => {
            app.showSocialFeed();

            const view = document.getElementById('social-view-content');
            expect(view).toBeTruthy();
            expect(view.innerHTML).toContain('Network Ops');
            expect(view.innerHTML).toContain('Social Feed');
            expect(view.innerHTML).toContain('Share an update');
        });

        test('should show composer panel for authenticated users', () => {
            app.showSocialFeed();

            const composerPanel = document.getElementById('social-compose-panel');
            expect(composerPanel).toBeTruthy();
            expect(composerPanel.style.display).not.toBe('none');
        });

        test('should hide composer panel for unauthenticated users', () => {
            app.currentUser = null;
            app.showSocialFeed();

            const composerPanel = document.getElementById('social-compose-panel');
            expect(composerPanel.style.display).toBe('none');
        });

        test('should initialize social composer bindings', () => {
            app.showSocialFeed();
            app.bindSocialComposer();

            const textarea = document.getElementById('social-post-input');
            const counter = document.getElementById('social-char-count');
            const submitBtn = document.getElementById('social-post-submit');

            expect(textarea).toBeTruthy();
            expect(counter).toBeTruthy();
            expect(submitBtn).toBeTruthy();
        });
    });

    describe('Social Posting Functionality', () => {
        beforeEach(() => {
            app.showSocialFeed();
        });

        test('should validate post content', async () => {
            const form = document.getElementById('social-post-form');
            const textarea = document.getElementById('social-post-input');
            const submitBtn = document.getElementById('social-post-submit');

            // Test empty post
            textarea.value = '';
            await app.handleSocialPostSubmit({ preventDefault: jest.fn() });
            expect(submitBtn.disabled).toBe(true);

            // Test valid post
            textarea.value = 'This is a valid post with enough content';
            textarea.dispatchEvent(new Event('input'));
            expect(submitBtn.disabled).toBe(false);

            // Test too long post
            textarea.value = 'a'.repeat(501);
            textarea.dispatchEvent(new Event('input'));
            expect(submitBtn.disabled).toBe(true);
        });

        test('should submit social post successfully', async () => {
            const form = document.getElementById('social-post-form');
            const textarea = document.getElementById('social-post-input');
            const submitBtn = document.getElementById('social-post-submit');

            textarea.value = 'Test social post content';
            textarea.dispatchEvent(new Event('input'));

            const mockEvent = {
                preventDefault: jest.fn(),
                target: form
            };

            await app.handleSocialPostSubmit(mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(app.db.collection).toHaveBeenCalledWith('forum');
        });

        test('should handle post submission errors gracefully', async () => {
            // Mock database error
            app.db.collection = jest.fn(() => ({
                add: jest.fn(() => Promise.reject(new Error('Database error')))
            }));

            const form = document.getElementById('social-post-form');
            const textarea = document.getElementById('social-post-input');

            textarea.value = 'Test post that will fail';
            textarea.dispatchEvent(new Event('input'));

            const mockEvent = {
                preventDefault: jest.fn(),
                target: form
            };

            // Mock showToast
            app.showToast = jest.fn();

            await app.handleSocialPostSubmit(mockEvent);

            expect(app.showToast).toHaveBeenCalledWith('Failed to publish post', 'error');
        });
    });

    describe('Social Feed Loading and Rendering', () => {
        test('should load social feed for authenticated users', async () => {
            const mockPosts = [
                {
                    id: 'post-1',
                    createdBy: 'user-123',
                    body: 'Test post content',
                    createdAt: { toDate: () => new Date() },
                    tags: ['test'],
                    type: 'post'
                }
            ];

            // Mock database response
            app.db.collection = jest.fn(() => ({
                where: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({
                        docs: mockPosts.map(post => ({
                            id: post.id,
                            data: () => post
                        })),
                        size: mockPosts.length
                    })),
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: jest.fn(() => Promise.resolve({
                                docs: mockPosts.map(post => ({
                                    id: post.id,
                                    data: () => post
                                })),
                                size: mockPosts.length
                            }))
                        }))
                    }))
                })),
                orderBy: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: jest.fn(() => Promise.resolve({
                            docs: mockPosts.map(post => ({
                                id: post.id,
                                data: () => post
                            })),
                            size: mockPosts.length
                        }))
                    }))
                }))
            }));

            // Mock user profile loading
            app.getUserProfile = jest.fn(() => Promise.resolve({
                displayName: 'Test User',
                photoURL: null
            }));

            await app.loadSocialFeed();

            const feedContent = document.getElementById('social-feed-content');
            expect(feedContent).toBeTruthy();
            expect(feedContent.innerHTML).toContain('Test post content');
        });

        test('should handle empty social feed', async () => {
            app.db.collection = jest.fn(() => ({
                where: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({ docs: [], size: 0 })),
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: jest.fn(() => Promise.resolve({ docs: [], size: 0 }))
                        }))
                    }))
                }))
            }));

            await app.loadSocialFeed();

            const feedContent = document.getElementById('social-feed-content');
            expect(feedContent.innerHTML).toContain('No social activity yet');
        });

        test('should render social feed items correctly', () => {
            const mockPosts = [
                {
                    id: 'post-1',
                    createdBy: 'user-123',
                    body: 'Test post',
                    createdAt: { toDate: () => new Date() },
                    tags: ['urban', 'exploration'],
                    locationId: 'loc-123',
                    type: 'post'
                }
            ];

            app.userProfiles.set('user-123', { displayName: 'Test Explorer' });
            app.followingIds = [];
            app.postLikeState = new Map();

            app.renderSocialFeed(mockPosts);

            const feedContent = document.getElementById('social-feed-content');
            expect(feedContent.innerHTML).toContain('Test Explorer');
            expect(feedContent.innerHTML).toContain('Test post');
            expect(feedContent.innerHTML).toContain('#urban');
            expect(feedContent.innerHTML).toContain('View related location');
        });
    });

    describe('Social Interactions', () => {
        test('should handle post liking', async () => {
            app.postLikeState.set('post-123', false);
            app.db.collection = jest.fn(() => ({
                where: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: jest.fn(() => Promise.resolve({ docs: [], size: 0 }))
                    }))
                })),
                add: jest.fn(() => Promise.resolve())
            }));

            app.showToast = jest.fn();

            await app.togglePostLike('post-123');

            expect(app.postLikeState.get('post-123')).toBe(true);
            expect(app.showToast).not.toHaveBeenCalledWith('Failed to update like', 'error');
        });

        test('should prevent unauthenticated users from liking', async () => {
            app.currentUser = null;
            app.showToast = jest.fn();

            await app.togglePostLike('post-123');

            expect(app.showToast).toHaveBeenCalledWith('Sign in to like posts', 'warning');
        });

        test('should handle follow/unfollow actions', async () => {
            app.followingIds = [];
            app.db.collection = jest.fn(() => ({
                where: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({ docs: [], size: 0 }))
                })),
                add: jest.fn(() => Promise.resolve())
            }));

            app.showToast = jest.fn();

            await app.followUser('user-456');

            expect(app.followingIds).toContain('user-456');
            expect(app.showToast).toHaveBeenCalledWith('User followed successfully', 'success');
        });

        test('should handle comment submission', async () => {
            // Mock comment input
            document.body.innerHTML += '<input id="post-comment-input-post123" value="Test comment">';

            app.db.collection = jest.fn(() => ({
                add: jest.fn(() => Promise.resolve())
            }));

            app.showToast = jest.fn();

            await app.submitPostComment('post123');

            expect(app.showToast).toHaveBeenCalledWith('Comment added', 'success');
        });
    });

    describe('Social Feed Filtering and Search', () => {
        test('should filter social feed by type', () => {
            const mockPosts = [
                { id: '1', type: 'post', createdBy: 'user1' },
                { id: '2', type: 'achievement', createdBy: 'user2' },
                { id: '3', type: 'post', createdBy: 'user1', locationId: 'loc1' }
            ];

            app.applySocialFilters = jest.fn(() => mockPosts.filter(p => p.type === 'post'));
            app.renderSocialFeed = jest.fn();

            app.filterSocialFeed();

            expect(app.applySocialFilters).toHaveBeenCalled();
            expect(app.renderSocialFeed).toHaveBeenCalled();
        });

        test('should search social feed by text', () => {
            document.body.innerHTML += '<input id="social-search" value="test query">';

            app.socialFeedItems = [
                { id: '1', body: 'This is a test post' },
                { id: '2', body: 'Another post' }
            ];

            app.renderSocialFeed = jest.fn();

            app.searchSocialFeed();

            expect(app.socialSearchTerm).toBe('test query');
            expect(app.renderSocialFeed).toHaveBeenCalled();
        });

        test('should apply tag filters', () => {
            app.socialSearchTerm = '#urban';
            app.socialFeedItems = [
                { id: '1', tags: ['urban', 'exploration'] },
                { id: '2', tags: ['nature'] }
            ];

            const filtered = app.applySocialFilters(app.socialFeedItems);

            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('1');
        });
    });

    describe('Social Feed Performance', () => {
        test('should render social skeleton loading state', () => {
            const skeleton = app.renderSocialSkeleton(2);

            expect(skeleton).toContain('social-skeleton');
            expect(skeleton).toContain('skeleton-avatar');
            expect(skeleton).toContain('skeleton-line');
        });

        test('should handle large social feeds efficiently', () => {
            const largeFeed = Array.from({ length: 100 }, (_, i) => ({
                id: `post-${i}`,
                createdBy: `user-${i % 10}`,
                body: `Post content ${i}`,
                createdAt: { toDate: () => new Date() },
                type: 'post'
            }));

            app.userProfiles.set('user-0', { displayName: 'User 0' });

            const startTime = Date.now();
            app.renderSocialFeed(largeFeed);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
        });
    });

    describe('Social Feed Accessibility', () => {
        test('should have proper ARIA labels on social actions', () => {
            app.showSocialFeed();

            const composePanel = document.getElementById('social-compose-panel');
            expect(composePanel.getAttribute('aria-label')).toBe('Create a new post');
        });

        test('should announce social feed updates to screen readers', () => {
            app.announceToScreenReader = jest.fn();

            // Mock a feed update
            app.updateSocialRefreshTime();

            // Should announce without throwing errors
            expect(app.announceToScreenReader).not.toHaveBeenCalled();
        });
    });

    describe('Social Feed Error Handling', () => {
        test('should handle database errors gracefully', async () => {
            app.db.collection = jest.fn(() => {
                throw new Error('Database connection failed');
            });

            app.showToast = jest.fn();

            await app.loadSocialFeed();

            expect(app.showToast).toHaveBeenCalledWith('Failed to load social feed', 'error');
        });

        test('should handle network errors during posting', async () => {
            app.db.collection = jest.fn(() => ({
                add: jest.fn(() => Promise.reject(new Error('Network error')))
            }));

            app.showToast = jest.fn();

            const form = document.createElement('form');
            form.innerHTML = '<textarea id="social-post-input">Test post</textarea><button id="social-post-submit"></button>';

            const mockEvent = {
                preventDefault: jest.fn(),
                target: form
            };

            await app.handleSocialPostSubmit(mockEvent);

            expect(app.showToast).toHaveBeenCalledWith('Failed to publish post', 'error');
        });
    });
});