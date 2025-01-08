---
layout: default
title: gallery
images:
  #- image_path: /photos/
  #  title: 
  - image_path: /photos/mosquitouse2.jpeg
    title: 모기쥐 완성판
  - image_path: /photos/mosquitouse.jpeg
    title: 모기쥐
  - image_path: /photos/owl.jpeg
    title: 부엉이
  - image_path: /photos/hippocampus.jpeg
    title: 해마
  - image_path: /photos/caught_bigfoot.jpeg
    title: 붙잡힌 빅풋
  - image_path: /photos/bigfoot.png
    title: 빅풋
  - image_path: /photos/flowerpot.png
    title: 화분
  - image_path: /photos/cloud.png
    title: 몽실몽실한 구름
  - image_path: /photos/apple.png
    title: 사과
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
    <ul class="photo-gallery">
      <table border="1" style="margin: auto; text-align: center;">
        <tbody>
          {% for image in page.images %}
            <tr><td><img src="{{ image.image_path }}" alt="{{ image.title }}"/></td></tr>
            <tr><td>{{ image.title }}</td></tr>
          {% endfor %}
        </tbody>
      </table>
    </ul>
  </div>
</div>
