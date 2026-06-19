import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventsComponent } from './events.component';
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

describe('EventsComponent', () => {
  let component: EventsComponent;
  let fixture: ComponentFixture<EventsComponent>;

  beforeEach(async () => {
    // Mock global alert and confirm to avoid blocking the test runner
    vi.stubGlobal('alert', () => {});
    vi.stubGlobal('confirm', () => true);

    await TestBed.configureTestingModule({
      imports: [EventsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminLayoutComponent, useClass: MockAdminLayoutComponent }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle tournament status when archiveTournament is called', () => {
    // Spring Member Open is initially ACTIVE
    const targetId = 'TRN-1042';
    const originalTrn = component.tournaments.find(t => t.id === targetId);
    expect(originalTrn).toBeDefined();
    expect(originalTrn?.status).toBe('ACTIVE');

    // Archive it
    component.archiveTournament(targetId);
    expect(originalTrn?.status).toBe('ARCHIVED');

    // Restore it
    component.archiveTournament(targetId);
    expect(originalTrn?.status).toBe('ACTIVE');
  });

  it('should filter out archived tournaments when showArchived is false', () => {
    component.layout.showArchived = false;
    
    // Archive one tournament
    component.archiveTournament('TRN-1042');

    const filtered = component.getFilteredTournaments();
    expect(filtered.some(t => t.id === 'TRN-1042')).toBe(false);
  });

  it('should show both archived and non-archived tournaments when showArchived is true', () => {
    component.layout.showArchived = true;
    
    // Archive one tournament
    component.archiveTournament('TRN-1042');

    const filtered = component.getFilteredTournaments();
    // It should include the archived tournament
    expect(filtered.some(t => t.id === 'TRN-1042')).toBe(true);
    // It should also include a non-archived tournament (TRN-1043)
    expect(filtered.some(t => t.id === 'TRN-1043')).toBe(true);
  });

  it('should filter tournaments by selected category tag', () => {
    // Junior Skills Clinic has tag 'CLINIC'
    component.selectedTag = 'CLINIC';
    
    const filtered = component.getFilteredTournaments();
    // Only CLINIC events should be present
    expect(filtered.every(t => t.tag === 'CLINIC')).toBe(true);
    expect(filtered.some(t => t.id === 'TRN-1043')).toBe(true);
    expect(filtered.some(t => t.id === 'TRN-1042')).toBe(false);
  });
});
