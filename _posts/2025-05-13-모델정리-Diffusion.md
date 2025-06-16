---
layout: post
title: 모델정리 - Diffusion
categories: 모델정리
---
# Contents
* TOC
{:toc}

# 구현

## DDPM

 - Simplified U-Net
 - score based CFG diffusion

참조 : [MNIST 학습 score based classifier free guidance diffusion 구현 코드 (pytorch)](https://gist.github.com/seokzoo/32b065f7c0e8c3a82790003423b8d018)

## Head 2
## Head 2


# 논문
## Denoising Diffusion Implicit Model(DDIM; Song et al., 2020)

## Latent Diffusion Model(LDM; Rombach & Blattmann, et al. 2022)

## Diffusion Transformer(DiT; Peebles & Xie, 2023)

## Diffusion of Thought(DoT; Ye Jiacheng et al, 2024)


# 사소한 것들에 대한 이야기

## reverse diffusion process에서 $q(x_{t-1}\mid x_t)$는 왜 Gaussian인가?

## L0를 계산할 때 discrete decoder로 다뤄야하는 이유?

## Langevin dynamics와 diffusion의 연관

