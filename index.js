// theme.js

function toggleTheme() {
    const body = document.body;
    const header = document.querySelector('header');
    const sections = document.querySelectorAll('section');
    const links = document.querySelectorAll('a');
    const features = document.querySelectorAll('.feature');
    const formContainer = document.querySelector('.form-container');
    const form = document.querySelector('form');
    const submitBtn = document.querySelector('.submit-btn');

    body.classList.toggle('dark');
    header.classList.toggle('dark');
    document.querySelector('.menu').classList.toggle('dark');
    
    sections.forEach(section => section.classList.toggle('dark'));
    links.forEach(link => link.classList.toggle('dark'));
    features.forEach(feature => feature.classList.toggle('dark'));
    formContainer.classList.toggle('dark');
    form.classList.toggle('dark');
    submitBtn.classList.toggle('dark');
}