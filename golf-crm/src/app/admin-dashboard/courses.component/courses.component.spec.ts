import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoursesComponent } from './courses.component';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminLayoutComponent } from '../admin-layout.component';

class MockAdminLayoutComponent {
  searchQuery = '';
  showArchived = false;
  userName = 'Test Admin';
  userInitials = 'TA';
  orgName = 'Test Club';
}

describe('CoursesComponent', () => {
  let component: CoursesComponent;
  let fixture: ComponentFixture<CoursesComponent>;

  beforeEach(async () => {
    // Mock global alert and confirm to avoid blocking the test runner
    vi.stubGlobal('alert', () => {});
    vi.stubGlobal('confirm', () => true);

    await TestBed.configureTestingModule({
      imports: [CoursesComponent],
      providers: [
        provideRouter([]),
        { provide: AdminLayoutComponent, useClass: MockAdminLayoutComponent }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle course status when archiveCourse is called', () => {
    // Oak Valley Championship Course is initially ACTIVE
    const targetId = 'CRS-001';
    const originalCourse = component.courses.find(c => c.id === targetId);
    expect(originalCourse).toBeDefined();
    expect(originalCourse?.status).toBe('ACTIVE');

    // Archive it
    component.archiveCourse(targetId);
    expect(originalCourse?.status).toBe('ARCHIVED');

    // Restore it
    component.archiveCourse(targetId);
    expect(originalCourse?.status).toBe('ACTIVE');
  });

  it('should filter out archived courses when showArchived is false', () => {
    component.layout.showArchived = false;
    
    // Archive one course
    component.archiveCourse('CRS-001');

    const filtered = component.getFilteredCourses();
    expect(filtered.some(c => c.id === 'CRS-001')).toBe(false);
  });

  it('should show both archived and active courses when showArchived is true', () => {
    component.layout.showArchived = true;
    
    // Archive one course
    component.archiveCourse('CRS-001');

    const filtered = component.getFilteredCourses();
    // It should include the archived course
    expect(filtered.some(c => c.id === 'CRS-001')).toBe(true);
    // It should also include an active/draft course (CRS-002)
    expect(filtered.some(c => c.id === 'CRS-002')).toBe(true);
  });
});
