import { Injectable } from '@angular/core';
import { RegistrationData } from '../interfaces/registration.interface';


@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private storageKey = 'golf_crm_registration_data';
  private data: RegistrationData = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading registration data from storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving registration data to storage', e);
    }
  }

  updateData(newData: Partial<RegistrationData>) {
    this.data = { ...this.data, ...newData };
    this.saveToStorage();
  }

  getData(): RegistrationData {
    return this.data;
  }

  clear() {
    this.data = {};
    localStorage.removeItem(this.storageKey);
  }
}
