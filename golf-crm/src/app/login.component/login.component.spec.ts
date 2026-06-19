import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FirebaseService } from '../services/firebase.service';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideRouter } from '@angular/router';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockFirebaseService: any;

  beforeEach(async () => {
    mockFirebaseService = {
      login: () => of({ success: true, user: { email: 'test@example.com', orgName: 'Test Org' } })
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([{ path: 'admin-dashboard', component: class {} }]),
        { provide: FirebaseService, useValue: mockFirebaseService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    
    // Clear localStorage before each test
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberMe');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load remembered credentials from localStorage on init', () => {
    localStorage.setItem('rememberedEmail', 'saved@golf.com');
    localStorage.setItem('rememberMe', 'true');

    component.ngOnInit();

    expect(component.form.value.email).toBe('saved@golf.com');
    expect(component.form.value.rememberMe).toBe(true);
  });

  it('should save credentials to localStorage on successful login if rememberMe is checked', () => {
    fixture.detectChanges();
    component.form.setValue({
      email: 'active@golf.com',
      password: 'password123',
      rememberMe: true
    });

    const loginSpy = vi.spyOn(mockFirebaseService, 'login');

    component.onSubmit();

    expect(loginSpy).toHaveBeenCalledWith('active@golf.com', 'password123');
    expect(localStorage.getItem('rememberedEmail')).toBe('active@golf.com');
    expect(localStorage.getItem('rememberMe')).toBe('true');
  });

  it('should clear credentials from localStorage on successful login if rememberMe is unchecked', () => {
    localStorage.setItem('rememberedEmail', 'old@golf.com');
    localStorage.setItem('rememberMe', 'true');

    fixture.detectChanges();
    component.form.setValue({
      email: 'active@golf.com',
      password: 'password123',
      rememberMe: false
    });

    component.onSubmit();

    expect(localStorage.getItem('rememberedEmail')).toBeNull();
    expect(localStorage.getItem('rememberMe')).toBeNull();
  });
});
