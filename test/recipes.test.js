const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const User = require("../database/models/users.js");

let token;
let id;

describe("Recipes API Tests", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.DATABASE_URI);
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash("okay", 10);
    await User.create({
      username: "admin",
      password: passwordHash,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe("POST /login", () => {
    test("should login user and return accessToken", async () => {
      const user = { username: "admin", password: "okay" };
      const response = await request(app).post("/login").send(user);
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body.success).toBe(true);
      token = response.body.accessToken;
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data).toHaveProperty("username");
    });

    it('Should fail when username or password is empty', async () => {
      const user = { username: "admin" };
      const response = await request(app).post('/login').send(user);
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'username or password can not be empty',
        })
      );
    });

    it('Should fail when password is empty', async () => {
      const user = { password: "okay" };
      const response = await request(app).post('/login').send(user);
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'username or password can not be empty',
        })
      );
    });

    it('Should fail when username does not exist', async () => {
      const user = { username: "chii", password: "okay" };
      const response = await request(app).post('/login').send(user);
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Incorrect username or password',
        })
      );
    });

    it('Incorrect password', async () => {
      const user = { username: "admin", password: "wrongpassword" };
      const response = await request(app).post('/login').send(user);
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Incorrect username or password',
        })
      );
    });

    it('do not sign in, internal server error', async () => {
      const user = { username: "admin", password: "okay" };
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error());
      const response = await request(app).post('/login').send(user);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'login failed.',
        })
      );
    });
  });

  describe('POST /recipes', () => {
    test('It should create a new recipe', async () => {
      const newRecipe = {
        name: 'Test Recipe',
        difficulty: 2,
        vegetarian: true,
      };
      const response = await request(app)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(newRecipe);
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
      id = response.body.data._id;
    });

    it('It should not create a recipe with invalid data', async () => {
      const newRecipe = {
        name: 'Nuggies',
        difficulty: 3,
        vegetarian: true,
      };
      const response = await request(app)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(newRecipe);
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });
  });

  describe('POST /recipes - error', () => {
    test('It should not create a new recipe and return 500', async () => {
      const newRecipe = {
        name: 'Test Recipe',
        difficulty: 2,
        vegetarian: true,
      };
      const Recipe = require('../database/models/recipes');
      jest.spyOn(Recipe, 'create').mockRejectedValueOnce(new Error('Database error'));
      const response = await request(app)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(newRecipe);
      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Failed to save recipes!',
        })
      );
    });
  });

  describe('GET /recipes', () => {
    test('It should get all recipes', async () => {
      const response = await request(app).get('/recipes');
      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );
    });
  });

  describe('GET /recipes/:id', () => {
    test('It should get a recipe by ID', async () => {
      const res = await request(app).get(`/recipes/${id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });
  });

  describe('PATCH /recipes/:id', () => {
    it('update the recipe record in db', async () => {
      const recipes = { name: 'checkin nuggets' };
      const response = await request(app)
        .patch(`/recipes/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(recipes);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });
  });

  describe('DELETE /recipes/:id', () => {
    it('delete the recipe record from db', async () => {
      const response = await request(app)
        .delete(`/recipes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Recipe successfully deleted',
        })
      );
    });
  });
});
