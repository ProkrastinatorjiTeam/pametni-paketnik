const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');

describe('Pametni Paketnik API', function () {
    const fakeId = new mongoose.Types.ObjectId().toString();
    let createdModelId;
    const agent = request.agent(app);

    before((done) => {
        agent
            .post('/user/login')
            .send({username: 'admin', password: 'admin'})
            .end((err) => {
                if (err) return done(err);
                done();
            });
    });

    it('GET /model3D/list - should return status 200 and an array', function (done) {
        agent
            .get('/model3D/list')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                if (!Array.isArray(res.body)) return done(new Error('Response is not an array'));
                done();
            });
    });

    it('GET /model3D/show/:id - should 404 for non-existing model', function (done) {
        agent
            .get(`/model3D/show/${fakeId}`)
            .expect(404, done);
    });

    it('PATCH /model3D/update/:id - should 404 for non-existing model', function (done) {
        agent
            .patch(`/model3D/update/${fakeId}`)
            .send({description: 'Updated description'})
            .expect(404, done);
    });

    it('DELETE /model3D/remove/:id - should 404 for non-existing model', function (done) {
        agent
            .delete(`/model3D/remove/${fakeId}`)
            .expect(404, done);
    });

    it('GET /order/list - should return status 200 and an array (admin only)', function (done) {
        agent
            .get('/order/list')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                if (!Array.isArray(res.body)) return done(new Error('Response is not an array'));
                done();
            });
    });

    it('GET /order/show/:id - should 404 for non-existing order (auth required)', function (done) {
        agent
            .get(`/order/show/${fakeId}`)
            .expect(404, done);
    });


    it('GET /box/list - should return 200 and array (admin only)', function (done) {
        agent
            .get('/box/list')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                if (!Array.isArray(res.body.boxes)) return done(new Error('Response.boxes is not an array'));
                done();
            });
    });

    it('POST /box/add - should create a new box', done => {
        agent
            .post('/box/add')
            .send({
                name: 'test',
                location: 'test',
                physicalId: 245
            })
            .expect(201)
            .expect(res => {
                if (!res.body.box || res.body.box.name !== 'test') {
                    throw new Error('Invalid response body');
                }
            })
            .end(done);
    });

    it('GET /box/show/:id - should 404 for non-existing box', function (done) {
        agent
            .get(`/box/show/${fakeId}`)
            .expect(404, done);
    });

    after(function (done) {
        if (!createdModelId) return done();

        agent
            .delete(`/model3D/remove/${createdModelId}`)
            .end(() => done());
    });

    after(async () => {
        await mongoose.connection.collection('boxes').deleteMany({});
        await mongoose.connection.collection('sessions').deleteMany({});
        await mongoose.connection.close();
        console.log('Mongoose connection closed');
    });
});
