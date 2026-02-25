---
date: 2025-08-30 00:00:00 +0900
layout: post
title: 지식정리 - Reinforcement Learning
categories: 지식정리
---

# Contents

- TOC
  {:toc}

# Value based RL

## DQN (Playing Atari with Deep Reinforcement Learning)

- Optimal Q-function에 대한 Bellman equation
- $$\begin{align}y=\mathbb{E}_{s^\prime\sim\epsilon}[r+\gamma\cdot\max_{a^\prime} Q(s^\prime,a^\prime;\theta_{old})] \\L(\theta_{new})=\mathbb{E}_{s,a\sim \rho(\cdot)}[(y-Q(s,a;\theta_{new}))^2] \\\nabla L(\theta_{new})=\mathbb{E}_{s,a\sim \rho(\cdot)}[(y-Q(s,a;\theta_{new}))\nabla Q(s,a;\theta_{new})]\\ \theta\leftarrow \theta-\alpha\cdot \nabla L(\theta) \end{align}$$
- target network와 experience replay를 적용해주면 된다

# Policy based RL

## vanilla policy gradient

-

## natural policy gradient

-

## TRPO

-

## PPO

-

## GRPO

-

# Actor Critic based RL

## Title

-
