---
layout: default
title: RX2 Solutions
---
{% capture hero_content %}
{% assign hero_title = site.data.home.hero.title | replace: 'Respectfully Professional, Always.', '<span class="rx2-home-hero-nowrap">Respectfully Professional, Always.</span>' %}
<div class="home-hero-copy">
  <h1>{{- hero_title -}}</h1>
  <p class="home-hero-subtitle">{{- site.data.home.hero.subtitle -}}</p>
</div>
{% endcapture %}

{% include mainslider.html text-color="white" content=hero_content background-video="AdobeStock_517044161_720p.mp4" %}

{% include services.html %}

{% include home-positioning.html %}

{% include testimonials.html %}

{% include home-contact-footer.html %}

{% include home-floating-cta.html %}
