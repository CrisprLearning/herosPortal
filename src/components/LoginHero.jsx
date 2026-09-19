import React from 'react';
import { asset } from '../lib/paths';

// Illustration beside the login card (left of it on wide screens).
export default function LoginHero() {
  return (
    <section className="pp-login-hero" aria-label="Welcome to Crispr Learning">
      <figure className="pp-slide is-active">
        <img src={asset('home-sliders/landing.png')} alt="A student working towards their goal" />
        <figcaption>Together, let’s help them<br />achieve their dream!</figcaption>
      </figure>
    </section>
  );
}
