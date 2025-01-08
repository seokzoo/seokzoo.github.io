---
layout: default
title: categories
permalink: /categories/
---

<div>
  <head>
    <title>{{ page.title }}</title>
  </head>
  <div class="post-back">
    <a class="black-link" href="{{ site.url | relative_url }}"> ← {{ site.moving.back_to }} </a>
  </div>
  <div>
    <h1>{{ page.title | capitalize }}</h1>
    <ul class="{{ page.title }}">
  {% for category in site.categories %}
    <li>
    <a class="post-link-layout" href="{{ page.url }}{{ category[0] }}">{{ category[0] | capitalize }}</a>
    </li>
  {% endfor %}
    </ul>
  </div>
</div>
