import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationCourseComponent } from './organization-course.component';

describe('OrganizationCourseComponent', () => {
  let component: OrganizationCourseComponent;
  let fixture: ComponentFixture<OrganizationCourseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationCourseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrganizationCourseComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
