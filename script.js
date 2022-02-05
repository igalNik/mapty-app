'use strict';

/*
 TITLE - Project Planing
 1. user stories - High level overview of whole app
      description of app functionality from the user perspective
 2. Feature - determine the exact feature we need to implement 
      user story
 3. Flowchart - visualize user actions and how the program react to them
 
 4. Project Architecture - 
      how we organize our code
      which features we will use

 5. Development step

 ::: implementing use story:
  :: common format:
  :: As a [type of user], i want [an function] so that [a benefit]
  ::         WHO                    WHAT                  WHY

  1. as a user i want to log my running workouts with location, distance,
     time, place and steps/minute, so i can keep a log of my all running.

  2. as a user i want to log my cycling workouts with location, distance,
     time, place and elevation gain, so i can keep a log of my all cycling.
  3. as a user, i want to see all my workouts at a glance so i can easily
     track my progress over time
  4. as a user, i want to see all my workouts on a map, so i can easily
     check where i work out at most
  5. as a user i want to see all my workouts when i leave the app and
     come back later, so i can using the app over time

     
::: implementing use Feature:
    1. Map Where the user clicks to add a new workout
       (best way to get user coordinates)
    2. geolocation to display map at current location
       (more user friendly)
    3. form to input distance, time, pace, step/minutes 
    4. form to input distance, time, pace, elevation gain 
    5. display all workouts on a list
    6. display all workouts on a map
    7. store all the user data on the browser using local storage API
    8. on a page load, reade the saved data from local storage and display
::: flow chart is on image
::: architecture on an image
    */

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// default position - israel
const defaultPosition = {
  latitude: 31.41271615095258,
  longitude: 34.96857851743699,
};

class Workout {
  // we never define id by our self - this is just for example
  id = +(+new Date() + '').slice(-12);
  distance; // in km
  duration; // in min
  coords; // [lat, lng]
  date;
  constructor(coords, distance, duration, date = new Date()) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.date = date;
  }
  static fromJSONObject(jsonObj) {
    // helper function to copy object properties
    const copy = (from, to) => {
      const keys = Object.keys(from);
      keys.forEach(key => {
        to[key] = from[key];
      });
    };
    let workout;
    if (jsonObj.type === 'running') {
      workout = new Running();
    }
    if (jsonObj.type === 'cycling') {
      workout = new Cycling();
    }
    copy(jsonObj, workout);
    return workout;
  }
  _setDescription() {
    const type = this.type[0].toLocaleUpperCase() + this.type.slice(1);
    const date = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
    }).format(this.date);

    this.description = `${type} on ${date}`;
  }
}

class Running extends Workout {
  cadence;
  pace;
  icon = '🏃🏽‍♂️';
  type = 'running';
  constructor(coords, distance, duration, cadence, date) {
    super(coords, distance, duration, date);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  elevationGain;
  icon = '🚴🏼';
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain, date) {
    super(coords, distance, duration, date);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////
// TITLE - App Class
////////////////////////////
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #marker;
  #zoomIn = 14;
  #zoomOut = 8;
  constructor() {
    this._getLocalStorage();

    this._getPosition();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._goToWorkout.bind(this));
  }

  _getPosition() {
    if (navigator) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
          this._loadMap.bind(this)(null);
        }.bind(this)
      );
    }
  }

  _loadMap(position) {
    // fine position
    const { latitude, longitude } = position?.coords || defaultPosition;
    const coords = [latitude, longitude];

    // choose appropriate zoom
    const zoom = position ? this.#zoomIn : this.#zoomOut;

    // creating and centering map to coords
    this.#map = L.map('map').setView(coords, zoom);
    const defaultTile = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

    // set map tiles
    L.tileLayer(defaultTile, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    // load markers from local storage
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));

    this.#map.setView(coords, zoom);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          closeButton: false,
          closeOnClick: false,
          autoClose: false,
          closeOnEscapeKey: false,
          autoPan: false,
          keepInView: true,
        })
      )
      .setPopupContent('Current Position')
      .openPopup();
  }

  _showForm(mapEvent) {
    this.#mapEvent = mapEvent;
    const { lat, lng } = mapEvent.latlng;
    if (!this.#marker) {
      this.#marker = L.marker([lat, lng]);
      this.#marker
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            closeButton: false,
            closeOnClick: false,
            autoClose: false,
            closeOnEscapeKey: false,
            autoPan: false,
            keepInView: true,
          })
        )
        .setPopupContent('Chosen location')
        .openPopup();
    } else this.#marker.setLatLng([lat, lng]);
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 500);
    // clear form inputs
    inputElevation.value =
      inputDistance.value =
      inputDuration.value =
      inputCadence.value =
        '';
  }

  _toggleElevationField(e) {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // helper functions
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    // dont restore the page
    e.preventDefault();

    // get position coords
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];

    // get data from inputs
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to bee a positive number');

      workout = new Running(coords, distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to bee a positive number');

      workout = new Cycling(coords, distance, duration, elevation);
    }
    this.#workouts.push(workout);

    // update local storage with new workout
    this._setLocalStorage();

    // display marker
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this.#marker.remove();
    this.#marker = null;
    this._hideForm();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 250,
          minHeight: 100,
          closeOnClick: false,
          autoClose: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.icon} ${workout.description}`)
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.icon}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;
    if (workout.type === 'running')
      // form element html
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
    `;
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        `;
    }

    html += `</li>`;

    form.insertAdjacentHTML('afterend', html);
  }
  _goToWorkout(e) {
    // get closest workout container if exist
    const clickedWorkout = e.target?.closest('.workout');

    if (!clickedWorkout) return;

    // get workout id
    const id = +e.target.closest('.workout').dataset.id;

    // get workout coords by workout id
    const coords = this.#workouts.find(workout => workout.id === id).coords;

    // go to workout position
    this.#map.flyTo(coords, this.#zoomIn);
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    data.forEach(obj => {
      const workout = Workout.fromJSONObject(obj);
      this.#workouts.push(workout);
      this._renderWorkout(workout);
    });
  }
  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
}

const app = new App();
console.log('hi');
