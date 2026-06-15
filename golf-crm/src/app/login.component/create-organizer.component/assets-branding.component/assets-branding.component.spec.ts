import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetsBrandingComponent } from './assets-branding.component';

describe('AssetsBrandingComponent', () => {
  let component: AssetsBrandingComponent;
  let fixture: ComponentFixture<AssetsBrandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsBrandingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetsBrandingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
