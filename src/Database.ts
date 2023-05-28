import bcrypt from 'bcrypt';
import WebSocket from 'ws';
import { LoginData } from './Interfaces.js';
import { Vector2 } from './Math.js';
import { User } from './Interfaces.js';

const BCRYPT_SALT_ROUNDS = 10;

export class Database {
  private localUsers: Array<User>;
  private localWorldState: object;

  private localUserId: number;

  public constructor() {
    this.localUsers = [];
    this.localUserId = 0;
  }

  public async connect(): Promise<void> {
    
  }

  public async authenticate(data: WebSocket.Data): Promise<User> {
    let loginData: LoginData;
    try {
      loginData = JSON.parse(data.toString());
    } catch (error) {
      console.log('database.authenticate malformed login data');
      return null;
    }
    if (!loginData.password || !loginData.username) {
      console.log('database.authenticate invalid login data');
      return null;
    }

    let user: User = await this.getUserByName(loginData.username);
    if (user) {
      const valid = await bcrypt.compare(loginData.password, user.password)
      .catch((error) => {
        console.error(error);
        return null;
      });
      if (!valid) {
        console.log('database.authenticate wrong password');
        return null;
      }
      console.log('database.authenticate correct password');
    }
    else {
      // temporarily create a new user for a new username
      console.log('database.authenticate creating new user');
      user = await this.createNewUser(
        loginData.username,
        loginData.password
      );
      this.localUsers.push(user);
    }

    // don't show password outside
    const copy = JSON.parse(JSON.stringify(user));
    delete copy.password;
    return copy;
  }

  public async getUserByName(username): Promise<User> {
    return this.localUsers.find((u: User) => {
      return u.username === username;
    });
  }

  public async updateUser(id: number, properties: any) {
    const user = this.localUsers.find(u => u.id === id);
    Object.assign(user, properties);
  }

  private async createNewUser(username: string,
                              password: string): Promise<User> {
    const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user: User = {
      id: this.localUserId++,
      username: username,
      password: hash
    }
    return user;
  }
}
