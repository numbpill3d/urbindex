// database_operations_test.js

const { expect } = require('chai');
const { setupTestEnvironment, tearDownTestEnvironment } = require('./test_utils');
const { createUser } = require('../src/database');
const db = require('../src/database');
// Removed duplicate import

describe('Database Operations', function() {
  before(function(done) {
    setupTestEnvironment(() => {
      const user = { id: 1, name: 'John Doe' };
      db.createUser(user, (err) => {
        if (err) return done(err);
        done();
      });
    });
  });

  after(function(done) {
    tearDownTestEnvironment(done);
  });

  describe('User Operations', function() {
    it('should create a user', function(done) {
      const user = createUser(1, 'John Doe');
      db.createUser(user, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('id', 1);
        expect(result).to.have.property('name', 'John Doe');
        done();
      });
    });

    it('should read a user', function(done) {
      db.getUserById(1, (err, user) => {
        expect(err).to.be.null;
        expect(user).to.have.property('id', 1);
        expect(user).to.have.property('name', 'John Doe');
        done();
      });
    });

    it('should update a user', function(done) {
      const updatedUser = { id: 1, name: 'Jane Doe' };
      db.updateUser(updatedUser, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('id', 1);
        expect(result).to.have.property('name', 'Jane Doe');
        done();
      });
    });

    it('should delete a user', function(done) {
      db.deleteUser(1, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.be.true;
        done();
      });
    });
  });

  describe('Social Feature Operations', function() {
    let user1, user2;

    before(function(done) {
      user1 = createUser(1, 'John Doe');
      user2 = createUser(2, 'Jane Doe');
      db.createUser(user1, (err) => {
        db.createUser(user2, done);
      });
    });

    after(function(done) {
      db.deleteUser(1, () => {
        db.deleteUser(2, done);
      });
    });

    it('should add a follower', function(done) {
      db.addFollower(user1.id, user2.id, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('followers').that.includes(user2.id);
        done();
      });
    });

    it('should add a following', function(done) {
      db.addFollowing(user1.id, user2.id, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('following').that.includes(user2.id);
        done();
      });
    });

    it('should add a comment', function(done) {
      const comment = { location: 'Location1', comment: 'Great spot!' };
      db.addComment(user1.id, comment.location, comment.comment, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('comments').that.deep.includes(comment);
        done();
      });
    });

    it('should add a like', function(done) {
      const like = 'Location1';
      db.addLike(user1.id, like, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('likes').that.includes(like);
        done();
      });
    });

    it('should add a notification', function(done) {
      const notification = 'New follower!';
      db.addNotification(user1.id, notification, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('notifications').that.includes(notification);
        done();
      });
    });

    it('should add a check-in', function(done) {
      const checkIn = 'Location1';
      db.addCheckIn(user1.id, checkIn, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('checkIns').that.includes(checkIn);
        done();
      });
    });

    it('should add a badge', function(done) {
      const badge = 'Explorer';
      db.addBadge(user1.id, badge, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('badges').that.includes(badge);
        done();
      });
    });

    it('should add a private spot', function(done) {
      const privateSpot = 'Secret Spot';
      db.addPrivateSpot(user1.id, privateSpot, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('privateSpots').that.includes(privateSpot);
        done();
      });
    });

    it('should add a shared group', function(done) {
      const sharedGroup = 'Friends';
      db.addSharedGroup(user1.id, sharedGroup, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('sharedGroups').that.includes(sharedGroup);
        done();
      });
    });

    it('should add to activity feed', function(done) {
      const activity = 'Visited Location1';
      db.addToActivityFeed(user1.id, activity, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('activityFeed').that.includes(activity);
        done();
      });
      db.addToActivityFeed(user1.id, activity, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('activityFeed').that.includes(activity);
        done();
      });
    });

    it('should add to photo gallery', function(done) {
      const photo = 'photo1.jpg';
      addToPhotoGallery(user1, photo);
      db.addToPhotoGallery(user1.id, photo, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('photoGallery').that.includes(photo);
        done();
      });
    });

    it('should add to mission board', function(done) {
      const mission = 'Complete 10 check-ins';
      addToMissionBoard(user1, mission);
      db.addToMissionBoard(user1.id, mission, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('missionBoard').that.includes(mission);
        done();
      });
    });

    it('should add a direct message', function(done) {
      const message = 'Hello Jane!';
      addDirectMessage(user1, message);
      db.addDirectMessage(user1.id, message, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.have.property('directMessages').that.includes(message);
        done();
      });
    });

    it('should send a message', function(done) {
      const messageContent = 'Hello Jane!';
      sendMessage(user1.id, user2.id, messageContent);
      db.getMessage(user1.id, user2.id, (err, message) => {
        expect(err).to.be.null;
        expect(message).to.have.property('message', messageContent);
        done();
      });
    });

    it('should like a post', function(done) {
      const postId = 'post1';
      likePost(user1.id, postId);
      db.getLike(user1.id, postId, (err, like) => {
        expect(err).to.be.null;
        expect(like).to.be.true;
        done();
      });
    });

    it('should comment on a post', function(done) {
      const postId = 'post1';
      const commentContent = 'Great post!';
      commentOnPost(user1.id, postId, commentContent);
      db.getComment(user1.id, postId, (err, comment) => {
        expect(err).to.be.null;
        expect(comment).to.have.property('comment', commentContent);
        done();
      });
    });
  });
});